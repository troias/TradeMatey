"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui";
import { toast } from "react-hot-toast";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import Link from "next/link";

export default function TradieOnboarding() {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    trade: "",
    location: "",
    bio: "",
    license: null as File | null,
    stripeAccountId: "",
  });
  const router = useRouter();

  useEffect(() => {
    const checkOnboarding = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      const { data } = await supabase
        .from("users")
        .select("has_completed_onboarding")
        .eq("id", user!.id)
        .single();
      if (data?.has_completed_onboarding) {
        router.push("/tradie/dashboard");
      }
    };
    checkOnboarding();
  }, [router]);

  const handleNext = async () => {
    if (step < 4) setStep(step + 1);
    else {
      const { data: { user } } = await supabase.auth.getUser();
      let licensePath = "";
      if (form.license) {
        const { data, error } = await supabase.storage
          .from("licenses")
          .upload(`${user!.id}/${form.license.name}`, form.license);
        if (error) {
          toast.error("Failed to upload license");
          return;
        }
        licensePath = data.path;
      }
      const { error } = await supabase
        .from("users")
        .update({
          trade: form.trade,
          location: form.location,
          bio: form.bio,
          stripe_account_id: form.stripeAccountId,
          license_path: licensePath,
          has_completed_onboarding: true,
        })
        .eq("id", user!.id);
      if (error) {
        toast.error("Failed to save profile");
      } else {
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
      <h1 className="text-3xl font-bold">Welcome, Tradie!</h1>
      {step === 1 && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Step 1: Watch Intro</h2>
          <video src="/tradie-intro.mp4" controls className="w-full rounded" />
          <p>
            Earn steady work with secure milestone payments (3.33% commission,
            1.67% for top tradies).
          </p>
        </div>
      )}
      {step === 2 && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Details</h2>
          <input
            type="text"
            placeholder="Trade (e.g., Plumbing)"
            value={form.trade}
            onChange={(e) => setForm({ ...form, trade: e.target.value })}
            className="w-full p-2 border rounded-md border-gray-300 dark:border-gray-600"
            required
          />
          <input
            type="text"
            placeholder="Location"
            value={form.location}
            onChange={(e) => setForm({ ...form, location: e.target.value })}
            className="w-full p-2 border rounded-md border-gray-300 dark:border-gray-600"
            required
          />
          <textarea
            placeholder="Bio"
            value={form.bio}
            onChange={(e) => setForm({ ...form, bio: e.target.value })}
            className="w-full p-2 border rounded-md border-gray-300 dark:border-gray-600"
          />
        </div>
      )}
      {step === 3 && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">
            Step 3: Verification & Payment
          </h2>
          <input
            type="file"
            accept="image/*,application/pdf"
            onChange={(e) =>
              setForm({ ...form, license: e.target.files?.[0] || null })}
            className="w-full"
            required
          />
          <input
            type="text"
            placeholder="Paste your Stripe Account ID"
            value={form.stripeAccountId}
            onChange={(e) =>
              setForm({ ...form, stripeAccountId: e.target.value })}
            className="w-full p-2 border rounded-md border-gray-300 rounded-md border-gray-600"}
            required
          />}
        </div>
      )}
      {step === 4 && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Step 4: Confirmation</h2>
          <p>Trade: {form.trade}</p>
          <p>Location: {form.location}</p>
          <p>Bio: {form.bio}</p>
          <p>License: {form.license?.name || "None"}</p>
          <p>Stripe Account: {form.stripeAccountId}</p>
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