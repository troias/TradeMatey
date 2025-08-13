import Stripe from "stripe";

const stripeSecret =
  process.env.STRIPE_SECRET_KEY || process.env.NEXT_PUBLIC_STRIPE_SECRET_KEY;

if (!stripeSecret) {
  // Provide a proxy object that throws on use to avoid runtime crashes during build
  console.warn(
    "Stripe secret key not set. Stripe-dependent routes will fail at runtime."
  );
}

export const stripe = stripeSecret
  ? new Stripe(stripeSecret, { apiVersion: "2025-05-28.basil" })
  : (new Proxy({} as Stripe, {
      get() {
        throw new Error("Stripe is not configured. Set STRIPE_SECRET_KEY.");
      },
    }) as unknown as Stripe);
