import { createServerClient } from "@/lib/supabase/server";
import { stripe } from "@/lib/stripe";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function POST() {
  try {
    const cookieStore = cookies();
    const supabase = createServerClient(cookieStore);

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase
      .from("users")
      .select("stripe_customer_id")
      .eq("id", user.id)
      .single();

    let customerId = profile?.stripe_customer_id;
    if (!customerId) {
      const customer = await stripe.customers.create({ email: user.email });
      customerId = customer.id;
      await supabase
        .from("users")
        .update({ stripe_customer_id: customerId })
        .eq("id", user.id);
    }

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ["card"],
      line_items: [{ price: "your_price_id", quantity: 1 }],
      mode: "subscription",
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?success=true`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?cancel=true`,
    });

    await supabase.from("premium").insert({
      user_id: user.id,
      stripe_subscription_id: session.subscription,
      status: "pending",
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("Premium subscription error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const cookieStore = cookies();
    const supabase = createServerClient(cookieStore);

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: subscription, error } = await supabase
      .from("premium")
      .select("stripe_subscription_id, status")
      .eq("user_id", user.id)
      .single();

    if (error || !subscription) {
      return NextResponse.json({ subscribed: false });
    }

    const stripeSubscription = await stripe.subscriptions.retrieve(
      subscription.stripe_subscription_id
    );
    return NextResponse.json({
      subscribed: stripeSubscription.status === "active",
      status: stripeSubscription.status,
    });
  } catch (error) {
    console.error("Premium status error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
