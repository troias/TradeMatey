import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-04-10",
});

export async function POST(request: Request) {
  const supabase = createClient();
  const { user_id } = await request.json();
  const { data: user } = await supabase
    .from("users")
    .select("stripe_customer_id")
    .eq("id", user_id)
    .single();

  if (!user.stripe_customer_id) {
    const customer = await stripe.customers.create({ metadata: { user_id } });
    await supabase
      .from("users")
      .update({ stripe_customer_id: customer.id })
      .eq("id", user_id);
    user.stripe_customer_id = customer.id;
  }

  const setupIntent = await stripe.setupIntents.create({
    customer: user.stripe_customer_id,
    payment_method_types: ["card"],
  });

  return NextResponse.json({ clientSecret: setupIntent.client_secret });
}
