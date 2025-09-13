import Stripe from "stripe";
import { createClient } from "@/lib/supabase/server";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-04-10",
});

export async function processMilestonePayment(milestoneId: string) {
  const supabase = createClient();
  try {
    // Fetch milestone and related job
    const { data: milestone, error: milestoneError } = await supabase
      .from("milestones")
      .select("*, job:jobs(client_id, region)")
      .eq("id", milestoneId)
      .single();
    if (milestoneError || !milestone) {
      throw new Error("Milestone not found");
    }

    // Fetch client payment details
    const { data: client, error: clientError } = await supabase
      .from("users")
      .select("stripe_customer_id, payment_method_id")
      .eq("id", milestone.job.client_id)
      .single();
    if (clientError || !client) {
      throw new Error("Client not found");
    }

    // Calculate commission (3.33%, capped at A$25 in regional Queensland)
    const commissionRate = 0.0333;
    let commission = milestone.amount * commissionRate;
    if (milestone.job.region === "Regional") {
      commission = Math.min(commission, 25); // A$25 cap
    }

    // Create payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round((milestone.amount + commission) * 100), // Convert to cents
      currency: "aud", // Use AUD for Queensland
      customer: client.stripe_customer_id,
      payment_method: client.payment_method_id,
      off_session: true,
      confirm: true,
      description: `Milestone: ${milestone.title} (Job: ${milestone.job_id})`,
      metadata: {
        milestone_id: milestoneId,
        commission: commission.toFixed(2),
        region: milestone.job.region,
      },
    });

    // Update milestone status
    const { error: updateError } = await supabase
      .from("milestones")
      .update({
        status: "paid",
        commission,
        payment_intent_id: paymentIntent.id,
        updated_at: new Date().toISOString(),
      })
      .eq("id", milestoneId);
    if (updateError) {
      throw new Error("Failed to update milestone");
    }

    // Notify client and tradie
    const { data: users } = await supabase
      .from("jobs")
      .select("client_id, tradie_id")
      .eq("id", milestone.job_id)
      .single();
    await supabase.from("notifications").insert([
      {
        user_id: users.client_id,
        message: `Milestone "${milestone.title}" paid (A$${
          milestone.amount
        }, commission A$${commission.toFixed(2)})`,
        job_id: milestone.job_id,
      },
      {
        user_id: users.tradie_id,
        message: `Milestone "${milestone.title}" paid (A$${milestone.amount})`,
        job_id: milestone.job_id,
      },
    ]);

    return { success: true, paymentIntent };
  } catch (error) {
    console.error("Payment error:", error);
    await supabase.from("notifications").insert({
      user_id: (await supabase.auth.getUser()).data.user!.id,
      message: `Payment failed for milestone ${milestoneId}: ${error.message}`,
      job_id: milestone?.job_id,
    });
    return { success: false, error: error.message };
  }
}
