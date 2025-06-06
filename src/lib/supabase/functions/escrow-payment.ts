// src/lib/supabase/functions/escrow-payment.ts
import Stripe from "stripe";
import { createClient } from "@/lib/supabase/server";
const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY"));
const supabase = createClient();
export async function handler(req) {
  const { booking_id, client_id, amount, is_regional } = await req.json();
  const commissionRate = 0.0333;
  let commission = amount * commissionRate;
  if (is_regional) commission = Math.min(commission, 25);
  const paymentIntent = await stripe.paymentIntents.create({
    amount: Math.round((amount + commission) * 100),
    currency: "aud",
    metadata: { booking_id, client_id, commission: commission.toString() },
  });
  const { error } = await supabase.from("payments").insert({
    booking_id,
    client_id,
    amount,
    status: "held",
    payment_intent_id: paymentIntent.id,
  });
  if (error) throw new Error(error.message);
  return new Response(
    JSON.stringify({ clientSecret: paymentIntent.client_secret })
  );
}
