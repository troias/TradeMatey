import { stripe } from "@/lib/stripe";
import { supabase } from "@/lib/supabase/server";

export async function POST(req: Request) {
  const { userId, planType } = await req.json();
  const session = await stripe.checkout.sessions.create({
    customer: (
      await supabase
        .from("users")
        .select("stripe_customer_id")
        .eq("id", userId)
        .single()
    ).data.stripe_customer_id,
    mode: "subscription",
    line_items: [{ price: "price_xxx", quantity: 1 }],
    success_url: `${process.env.NEXT_PUBLIC_URL}/success`,
    cancel_url: `${process.env.NEXT_PUBLIC_URL}/cancel`,
  });
  await supabase
    .from("premium")
    .insert({
      user_id: userId,
      plan_type: planType,
      subscription_status: "active",
    });
  return NextResponse.json({ url: session.url });
}
