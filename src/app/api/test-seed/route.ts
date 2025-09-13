import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// This endpoint is intentionally guarded by a shared secret to avoid accidental
// execution in production. CI sets TEST_SEED_TOKEN in the job that runs E2E.
export async function POST(request: Request) {
  // Never allow seeding in production unless explicitly overridden. CI/local
  // e2e runners may start a production server from a build; allow an
  // explicit override for local/in-house runs by setting
  // ALLOW_TEST_SEED_IN_PROD=1 in the environment. This avoids accidental
  // exposure in real production environments while allowing deterministic
  // seeding for tests.
  if (process.env.NODE_ENV === 'production' && process.env.ALLOW_TEST_SEED_IN_PROD !== '1') {
    return NextResponse.json({ error: 'Forbidden in production' }, { status: 403 });
  }

  const _reqHeaders = (request as any)?.headers;
  const token = typeof _reqHeaders?.get === 'function' ? _reqHeaders.get('x-test-seed-token') : undefined;
  const secret = process.env.TEST_SEED_TOKEN;
  if (!token || !secret || token !== secret) {
    return NextResponse.json({ error: 'Forbidden - invalid seed token' }, { status: 403 });
  }

  try {
    const supabase = createClient();

    // Upsert deterministic users and job/milestone rows used by e2e tests
    // IDs are intentionally stable so tests can reference them.
    const clientId = 'seed_client_001';
    const tradieId = 'seed_tradie_001';
    const jobId = 'seeded-job-001';
    const milestoneId = 'seeded-ms-001';
    // Allow caller to request a specific stripe customer id for the client for testing
    let body: any = {};
    try {
      body = await request.json();
    } catch {}

    const clientStripeId = typeof body?.stripe_customer_id === 'string' ? body.stripe_customer_id : null;
    // If a STRIPE_SECRET_KEY is present, create a test customer and a payment method
    let createdStripeCustomer: string | null = clientStripeId;
    let createdPaymentMethod: string | null = null;
    if (process.env.STRIPE_SECRET_KEY) {
      try {
        const stripeMod = await import('stripe');
  const Stripe = (stripeMod && (stripeMod.default || stripeMod));
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
        if (!createdStripeCustomer) {
          const c = await stripe.customers.create({ email: 'seed-client@example.com' });
          createdStripeCustomer = c.id;
        }
        // Create a PaymentMethod using Stripe test card (4242)
        const pm = await stripe.paymentMethods.create({
          type: 'card',
          card: { number: '4242424242424242', exp_month: 12, exp_year: 2030, cvc: '123' },
        });
        createdPaymentMethod = pm.id;
        // attach to customer
        await stripe.paymentMethods.attach(pm.id, { customer: createdStripeCustomer });
      } catch {
        // Ignore Stripe failures but continue; createdStripeCustomer may be null
        createdStripeCustomer = createdStripeCustomer || null;
      }
    }

    await supabase.from('users').upsert({ id: clientId, email: 'seed-client@example.com', stripe_customer_id: createdStripeCustomer }, { onConflict: 'id' });
    await supabase.from('users').upsert({ id: tradieId, email: 'seed-tradie@example.com' }, { onConflict: 'id' });

    await supabase.from('jobs').upsert({ id: jobId, client_id: clientId, title: 'E2E seeded job', status: 'open' }, { onConflict: 'id' });

    await supabase.from('job_interest').upsert({ job_id: jobId, tradie_id: tradieId, status: 'interested' }, { onConflict: 'job_id,tradie_id' });

    await supabase.from('milestones').upsert({ id: milestoneId, job_id: jobId, title: 'phase 1', amount: 100, status: 'open', tradie_id: null }, { onConflict: 'id' });

  return NextResponse.json({ seeded: true, jobId, milestoneId, clientId, tradieId, stripeCustomerId: createdStripeCustomer, stripePaymentMethodId: createdPaymentMethod });
  } catch (err) {
    return NextResponse.json({ error: 'seed failed', detail: String(err) }, { status: 500 });
  }
}
