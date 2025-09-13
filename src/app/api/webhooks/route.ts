// src/app/api/webhooks/stripe/route.ts
import { stripe } from "@/lib/stripe";
import { supabase } from "@/lib/supabase";
export async function POST(request: Request) {
  const payload = await request.text();
  const sig = request.headers.get("stripe-signature");
  let event;
  try {
    event = stripe.webhooks.constructEvent(
      payload,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch {
    return new Response("Webhook Error", { status: 400 });
  }
  if (event.type === "payment_intent.succeeded") {
    const paymentIntent = event.data.object;
    await supabase
      .from("payments")
      .update({ status: "completed" })
      .eq("payment_intent_id", paymentIntent.id);
  }
  return new Response("OK", { status: 200 });
}
