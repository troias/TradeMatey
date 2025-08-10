"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/Button";
import { toast } from "react-hot-toast";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { loadStripe } from "@stripe/stripe-js";
import {
  Elements,
  CardElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import Link from "next/link";

const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!
);

const supabase = createClient();

function PaymentForm({ onSuccess }: { onSuccess: () => void }) {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const res = await fetch("/api/payments/setup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: user!.id }),
    });
    const { clientSecret } = await res.json();
    const { error, setupIntent } = await stripe!.confirmCardSetup(
      clientSecret,
      {
        payment_method: { card: elements!.getElement(CardElement)! },
      }
    );
    if (error) {
      toast.error(error.message!);
    } else {
      await supabase
        .from("users")
        .update({ payment_method_id: setupIntent!.payment_method })
        .eq("id", user!.id);
      toast.success("Payment method added!");
      onSuccess();
    }
    setLoading(false);
  };

  return (
    <form onSubmit={handleSubmit}>
      <CardElement />
      <Button type="submit" disabled={loading} className="mt-2 w-full">
        {loading ? "Processing..." : "Set Up Payout Method"}
      </Button>
    </form>
  );
}

export default function Onboarding() {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    name: "",
    email: "",
    region: "",
    trade: "",
    bio: "",
    payoutMethod: "",
  });
  const router = useRouter();

  useEffect(() => {
    const fetchUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const { data } = await supabase
        .from("users")
        .select("email, region, trade, bio")
        .eq("id", user!.id)
        .single();
      setForm((prev) => ({
        ...prev,
        email: data?.email || user?.email || "",
        region: data?.region || "",
        trade: data?.trade || "",
        bio: data?.bio || "",
      }));
    };
    fetchUser();
  }, []);

  const handleNext = async () => {
    console.log("handleNext called, step:", step);
    if (step < 4) setStep(step + 1);
    else {
      console.log("Finish clicked, submitting onboarding...");
      const {
        data: { user },
      } = await supabase.auth.getUser();
      console.log("Supabase user:", user);
      const { error: profileError } = await supabase
        .from("profiles")
        .update({ role: "tradie" })
        .eq("id", user!.id);
      console.log("Profile update error:", profileError);
      const { error: userError } = await supabase
        .from("users")
        .update({
          region: form.region,
          trade: form.trade,
          bio: form.bio,
          has_completed_onboarding: true,
          roles: ["employee"],
        })
        .eq("id", user!.id);
      console.log("User update error:", userError);
      if (profileError || userError) {
        toast.error("Failed to save profile");
      } else {
        // Check if onboarding data was saved
        const { data: verifyData, error: verifyError } = await supabase
          .from("users")
          .select("region, trade, bio, has_completed_onboarding")
          .eq("id", user!.id)
          .single();
        console.log(
          "Verification data:",
          verifyData,
          "Verification error:",
          verifyError
        );
        if (
          verifyError ||
          !verifyData ||
          verifyData.region !== form.region ||
          verifyData.trade !== form.trade ||
          verifyData.bio !== form.bio ||
          !verifyData.has_completed_onboarding
        ) {
          toast.error("Onboarding data not saved correctly. Please try again.");
          return;
        }
        await supabase.from("badges").insert([
          {
            user_id: user!.id,
            badge: "Welcome Aboard",
            earned_at: new Date().toISOString(),
          },
        ]);
        await supabase.from("notifications").insert({
          user_id: user!.id,
          message: "You earned the 'Welcome Aboard' badge!",
        });
        toast.success("Onboarding completed!");
        router.push("/tradie/dashboard");
      }
    }
  };

  return (
    <div className="max-w-md mx-auto p-6 space-y-6">
      <h1 className="text-3xl font-bold">Welcome to TradeMatey</h1>
      {step === 1 && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Step 1: Watch Intro</h2>
          <video src="/intro.mp4" controls className="w-full rounded" />
          <p>
            Secure milestone payments with 3.33% commission and QBCC-compliant
            14+14 day timelines.
          </p>
        </div>
      )}
      {step === 2 && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Step 2: Personal Info</h2>
          <input
            type="text"
            placeholder="Name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="w-full rounded-md border-gray-300 dark:border-gray-600"
            required
          />
          <input
            type="email"
            placeholder="Email"
            value={form.email}
            disabled
            className="w-full rounded-md border-gray-300 dark:border-gray-600"
          />
          <select
            value={form.region}
            onChange={(e) => setForm({ ...form, region: e.target.value })}
            className="w-full rounded-md border-gray-300 dark:border-gray-600"
            required
          >
            <option value="">Select Region</option>
            <option value="Regional">Regional Queensland</option>
            <option value="Metro">Metro Queensland</option>
          </select>
          <input
            type="text"
            placeholder="Trade (e.g., Plumber)"
            value={form.trade}
            onChange={(e) => setForm({ ...form, trade: e.target.value })}
            className="w-full rounded-md border-gray-300 dark:border-gray-600"
            required
          />
          <textarea
            placeholder="Bio"
            value={form.bio}
            onChange={(e) => setForm({ ...form, bio: e.target.value })}
            className="w-full rounded-md border-gray-300 dark:border-gray-600"
          />
        </div>
      )}
      {step === 3 && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">
            Step 3: Set Up Payout Method
          </h2>
          <Elements stripe={stripePromise}>
            <PaymentForm
              onSuccess={() => setForm({ ...form, payoutMethod: "Card Added" })}
            />
          </Elements>
          <Button
            type="button"
            className="mt-2 w-full bg-gray-200 text-gray-700"
            onClick={() => setStep(4)}
          >
            Skip for now
          </Button>
          <p className="text-sm text-gray-600">
            Add your payout method to receive client payments securely. 3.33%
            commission per milestone (
            {form.region === "Regional" ? "capped at A$25" : "no cap"}). You can
            set up your payout method later from your dashboard.
          </p>
        </div>
      )}
      {step === 4 && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Step 4: Confirmation</h2>
          <p>Name: {form.name}</p>
          <p>Email: {form.email}</p>
          <p>Region: {form.region}</p>
          <p>Trade: {form.trade}</p>
          <p>Bio: {form.bio}</p>
          <p>Payout Method: {form.payoutMethod}</p>
          <div className="mt-4 p-4 bg-blue-100 rounded">
            <p className="font-bold">Go Premium for A$99/year!</p>
            <p>Enjoy 1.67% commission and priority job matching.</p>
            <Link href="/premium">
              <Button>Learn More</Button>
            </Link>
          </div>
        </div>
      )}
      <Button onClick={handleNext} className="w-full">
        {step === 4 ? "Finish" : "Next"}
      </Button>
    </div>
  );
}
