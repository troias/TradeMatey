import { createClient } from "@/lib/supabase/server";
import Stripe from "stripe";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const { milestoneId, amount } = await request.json();
    const supabase = createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: milestone, error: milestoneError } = await supabase
      .from("milestones")
      .select("*, jobs!inner(client_id, region)")
      .eq("id", milestoneId)
      .single();

    if (milestoneError || !milestone) {
      return NextResponse.json(
        { error: "Milestone not found" },
        { status: 404 }
      );
    }
    if (milestone.jobs.client_id !== user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { data: profile, error: profileError } = await supabase
      .from("users")
      .select("stripe_customer_id")
      .eq("id", user.id)
      .single();

    if (profileError || !profile?.stripe_customer_id) {
      return NextResponse.json({ error: "No payment method" }, { status: 400 });
    }

    const commission =
      milestone.jobs.region === "Regional"
        ? Math.min(amount * 0.0333, 25)
        : amount * 0.0333;

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
      apiVersion: "2025-05-28.basil",
    });
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round((amount + commission) * 100),
      currency: "aud",
      customer: profile.stripe_customer_id,
      automatic_payment_methods: { enabled: true },
      metadata: { milestoneId, commission: commission.toString() },
    });

    await supabase.from("payments").insert({
      milestone_id: milestoneId,
      amount,
      commission_fee: commission,
      payment_intent_id: paymentIntent.id,
      status: "pending",
      client_id: user.id,
    });

    await supabase
      .from("milestones")
      .update({ status: "pending", payment_intent_id: paymentIntent.id })
      .eq("id", milestoneId);

    return NextResponse.json({ clientSecret: paymentIntent.client_secret });
  } catch (error) {
    console.error("Payment error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const { milestoneId } = await request.json();
    const supabase = createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: milestone, error: milestoneError } = await supabase
      .from("milestones")
      .select("*, jobs!inner(tradie_id)")
      .eq("id", milestoneId)
      .single();

    if (milestoneError || !milestone) {
      return NextResponse.json(
        { error: "Milestone not found" },
        { status: 404 }
      );
    }
    if (milestone.jobs.tradie_id !== user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { data: payment, error: paymentError } = await supabase
      .from("payments")
      .select("payment_intent_id, amount, client_id")
      .eq("milestone_id", milestoneId)
      .single();

    if (paymentError || !payment) {
      return NextResponse.json({ error: "Payment not found" }, { status: 404 });
    }

    const { data: tradie, error: tradieError } = await supabase
      .from("accounts")
      .select("stripe_account_id")
      .eq("user_id", milestone.jobs.tradie_id)
      .single();

    if (tradieError || !tradie?.stripe_account_id) {
      return NextResponse.json(
        { error: "Tradie account not set up" },
        { status: 400 }
      );
    }

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
      apiVersion: "2025-05-28.basil",
    });
    const paymentIntent = await stripe.paymentIntents.retrieve(
      payment.payment_intent_id
    );
    if (paymentIntent.status !== "succeeded") {
      return NextResponse.json(
        { error: "Payment not completed" },
        { status: 400 }
      );
    }

    const commission =
      milestone.jobs.region === "Regional"
        ? Math.min(payment.amount * 0.0333, 25)
        : payment.amount * 0.0333;

    await stripe.transfers.create({
      amount: Math.round((payment.amount - commission) * 100),
      currency: "aud",
      destination: tradie.stripe_account_id,
      transfer_group: `milestone_${milestoneId}`,
    });

    await supabase
      .from("payments")
      .update({ status: "completed" })
      .eq("milestone_id", milestoneId);

    await supabase.from("badges").insert({
      user_id: milestone.jobs.tradie_id,
      badge: "First Job",
      earned_at: new Date(),
    });

    await supabase
      .from("milestones")
      .update({ status: "completed" })
      .eq("id", milestoneId);

    await supabase.from("notifications").insert({
      user_id: payment.client_id,
      message: `Milestone ${milestone.title} verified and paid`,
      job_id: milestone.job_id,
    });

    return NextResponse.json({ message: "Milestone verified and paid" });
  } catch (error) {
    console.error("Verification error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
