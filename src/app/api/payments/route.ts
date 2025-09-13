import { createClient } from '@/lib/supabase/server';
import Stripe from 'stripe';
import { NextResponse } from 'next/server';
import { getLogger } from '@/lib/logger';

export async function POST(request: Request) {
  const _reqHeaders = (request as any)?.headers;
  const requestId = typeof _reqHeaders?.get === 'function' ? _reqHeaders.get('x-request-id') : undefined;
  const baseLog = getLogger({ requestId });

  try {
    const body = await request.json();
    const { milestoneId, amount, useSaved, paymentMethodId, force_pay_early } = body as Record<string, unknown>;
    const mid = typeof milestoneId === 'string' ? milestoneId : undefined;
    const amt = typeof amount === 'number' ? amount : typeof amount === 'string' ? Number(amount) : undefined;
    const pmId = typeof paymentMethodId === 'string' ? paymentMethodId : undefined;
    if (!mid || !amt) return NextResponse.json({ error: 'milestoneId and amount required' }, { status: 400 });

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const log = baseLog.child({ userId: user.id });

    const { data: milestone, error: milestoneError } = await supabase
      .from('milestones')
      .select('*, jobs!inner(client_id)')
      .eq('id', mid)
      .single();

    if (milestoneError || !milestone) {
      log.warn('Milestone not found', { milestoneId: mid });
      return NextResponse.json({ error: 'Milestone not found' }, { status: 404 });
    }
    if (milestone.jobs.client_id !== user.id) {
      log.warn('Client mismatch for milestone', { milestoneId: mid, clientId: milestone.jobs.client_id });
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const forcePayEarly = !!force_pay_early;
    if (!milestone.tradie_id && !forcePayEarly) {
      log.warn('Milestone missing tradie on payment attempt', { milestoneId: mid });
      return NextResponse.json({ error: 'Milestone does not have an assigned tradie' }, { status: 400 });
    }

    if (milestone.status !== 'pending' && !forcePayEarly) {
      log.warn('Milestone not ready for payment', { milestoneId: mid, status: milestone.status });
      return NextResponse.json({ error: 'Milestone not ready for payment' }, { status: 400 });
    }

    const { data: profile, error: profileError } = await supabase.from('users').select('stripe_customer_id').eq('id', user.id).single();
    if (profileError || !profile?.stripe_customer_id) {
      log.warn('No stripe customer for client', { clientId: user.id });
      return NextResponse.json({ error: 'No payment method' }, { status: 400 });
    }

    const jobsObj = milestone.jobs as unknown;
    const region = typeof jobsObj === 'object' && jobsObj !== null ? (jobsObj as Record<string, unknown>).region : undefined;
    const commission = region === 'Regional' ? Math.min(amt * 0.0333, 25) : amt * 0.0333;

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, { apiVersion: '2025-05-28.basil' });
    let paymentIntent: Stripe.PaymentIntent;
    if (useSaved && pmId) {
      paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round((amt + commission) * 100),
        currency: 'aud',
        customer: profile.stripe_customer_id,
        payment_method: pmId,
        off_session: true,
        confirm: true,
        metadata: { milestoneId: mid, commission: commission.toString() },
      });
    } else {
      paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round((amt + commission) * 100),
        currency: 'aud',
        customer: profile.stripe_customer_id,
        automatic_payment_methods: { enabled: true },
        metadata: { milestoneId: mid, commission: commission.toString() },
      });
    }

    await supabase.from('payments').insert({
      milestone_id: mid,
      amount: amt,
      commission_fee: commission,
      payment_intent_id: paymentIntent.id,
      status: paymentIntent.status === 'succeeded' ? 'completed' : 'pending',
      client_id: user.id,
    });

    await supabase.from('milestones').update({ status: paymentIntent.status === 'succeeded' ? 'completed' : 'pending', payment_intent_id: paymentIntent.id }).eq('id', mid);

    log.info('Payment created', { milestoneId: mid, paymentIntentId: paymentIntent.id, status: paymentIntent.status });

    return NextResponse.json({ clientSecret: paymentIntent.client_secret });
  } catch (err: unknown) {
    await baseLog.error('Payment error', { err: String(err) });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const _reqHeaders = (request as any)?.headers;
  const requestId = typeof _reqHeaders?.get === 'function' ? _reqHeaders.get('x-request-id') : undefined;
  const baseLog = getLogger({ requestId });
  try {
    const { milestoneId } = await request.json();
    const supabase = createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const log = baseLog.child({ userId: user.id });

    const { data: milestone, error: milestoneError } = await supabase.from('milestones').select('*, jobs!inner(tradie_id)').eq('id', milestoneId).single();

    if (milestoneError || !milestone) {
      log.warn('Milestone not found for verification', { milestoneId });
      return NextResponse.json({ error: 'Milestone not found' }, { status: 404 });
    }
    if (milestone.jobs.tradie_id !== user.id) {
      log.warn('Unauthorized tradie verifying milestone', { milestoneId });
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { data: payment, error: paymentError } = await supabase.from('payments').select('payment_intent_id, amount, client_id').eq('milestone_id', milestoneId).single();
    if (paymentError || !payment) return NextResponse.json({ error: 'Payment not found' }, { status: 404 });

    const { data: tradie, error: tradieError } = await supabase.from('accounts').select('stripe_account_id').eq('user_id', milestone.jobs.tradie_id).single();
    if (tradieError || !tradie?.stripe_account_id) return NextResponse.json({ error: 'Tradie account not set up' }, { status: 400 });

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, { apiVersion: '2025-05-28.basil' });
    const paymentIntent = await stripe.paymentIntents.retrieve(payment.payment_intent_id as string);
    if (paymentIntent.status !== 'succeeded') return NextResponse.json({ error: 'Payment not completed' }, { status: 400 });

    const commission = milestone.jobs.region === 'Regional' ? Math.min(payment.amount * 0.0333, 25) : payment.amount * 0.0333;

    await stripe.transfers.create({ amount: Math.round((payment.amount - commission) * 100), currency: 'aud', destination: tradie.stripe_account_id, transfer_group: `milestone_${milestoneId}` });

    await supabase.from('payments').update({ status: 'completed' }).eq('milestone_id', milestoneId);

    await supabase.from('badges').insert({ user_id: milestone.jobs.tradie_id, badge: 'First Job', earned_at: new Date() });

    await supabase.from('milestones').update({ status: 'completed' }).eq('id', milestoneId);

    await supabase.from('notifications').insert({ user_id: payment.client_id, message: `Milestone ${milestone.title} verified and paid`, job_id: milestone.job_id });

    log.info('Milestone verified and paid', { milestoneId });

    return NextResponse.json({ message: 'Milestone verified and paid' });
  } catch (error) {
    await baseLog.error('Verification error', { err: String(error) });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
