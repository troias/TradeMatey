// src/app/api/webhooks/stripe/route.ts
import { stripe } from "@/lib/stripe";
import requireSupabase from "@/lib/supabase/helpers";
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
    try {
      const supabase = requireSupabase();
      await supabase
        .from("payments")
        .update({ status: "completed" })
        .eq("payment_intent_id", paymentIntent.id);
    } catch (err) {
      // If Supabase not configured, surface a clear log but do not crash the webhook processing
      console.error("Unable to update payment status: ", err);
    }
  }
  return new Response("OK", { status: 200 });
}
