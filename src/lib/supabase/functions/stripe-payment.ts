import Stripe from "stripe";
import { createClient } from "@/lib/supabase/server";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!);

export async function handler(req: Request) {
  const supabase = createClient();
  const { amount, client_id, milestone_id } = await req.json();
  const { data: milestone } = await supabase
    .from("milestones")
    .select("*, jobs!inner(region)")
    .eq("id", milestone_id)
    .single();

  const commission =
    milestone.jobs.region === "Regional"
      ? Math.min(amount * 0.0333, 25)
      : amount * 0.0333;

  const paymentIntent = await stripe.paymentIntents.create({
    amount: Math.round((amount + commission) * 100),
    currency: "aud",
    metadata: { client_id, milestone_id },
  });

  await supabase.from("payments").insert({
    milestone_id,
    client_id,
    amount,
    status: "pending",
    payment_intent_id: paymentIntent.id,
  });

  return new Response(
    JSON.stringify({ clientSecret: paymentIntent.client_secret })
  );
}
