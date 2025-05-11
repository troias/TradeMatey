import Stripe from "stripe ";
const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY ")!);
export async function handler(req: Request) {
  const { amount, client_id, job_id } = await req.json();
  const paymentIntent = await stripe.paymentIntents.create({
    amount,
    currency: "usd ",
    metadata: { client_id, job_id },
  });
  const commissionFee = amount * 0.1; // 10% commission
  await supabase.from("payments ").insert({
    job_id,
    client_id,
    amount,
    status: "pending ",
    stripe_payment_id: paymentIntent.id,
    commission_fee: commissionFee,
  });
  await supabase.from("commissions ").insert({
    source_type: "job ",
    source_id: job_id,
    amount: commissionFee,
  });
  return new Response(
    JSON.stringify({ clientSecret: paymentIntent.client_secret })
  );
}
