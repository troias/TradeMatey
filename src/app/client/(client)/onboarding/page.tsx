"use client";

import { useState, useEffect, useCallback } from "react";
import filter from "leo-profanity";
import { Button } from "@/components/ui";
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
        {loading ? "Processing..." : "Add Payment Method"}
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
    paymentMethod: "",
  });
  const [nameError, setNameError] = useState<string>("");
  const [regionError, setRegionError] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();

  // Initialize profanity dictionary once (safe to call multiple times)
  useEffect(() => {
    try {
      filter.loadDictionary("en");
    } catch {}
  }, []);

  const sanitizeName = useCallback((name: string) => {
    // Normalize and strip unsafe/invisible characters, collapse spaces
    let s = (name || "").normalize("NFKC");
    // Remove control and zero-width characters
    s = s.replace(
      /[\u0000-\u001F\u007F\u200B-\u200F\u202A-\u202E\u2060\uFEFF]/g,
      ""
    );
    // Trim and collapse multiple spaces
    s = s.trim().replace(/\s+/g, " ");
    // Keep only allowed characters (letters, spaces, apostrophes, hyphens, dots)
    s = s.replace(/[^\p{L}\s'’\-.]/gu, "");
    return s;
  }, []);

  const isNameValid = useCallback(
    (name: string) => {
      const trimmed = sanitizeName(name);
      if (trimmed.length < 2 || trimmed.length > 70) return false;
      // Allow letters (unicode), spaces, apostrophes, hyphens, dots
      const allowed = /^[\p{L}\s'’\-.]+$/u;
      if (!allowed.test(trimmed)) return false;
      // Must contain at least one letter
      const hasLetter = /\p{L}/u.test(trimmed);
      if (!hasLetter) return false;
      // Profanity/lewd check
      if (filter.check(trimmed.toLowerCase())) return false;
      return true;
    },
    [sanitizeName]
  );

  useEffect(() => {
    const fetchUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const { data } = await supabase
        .from("users")
        .select("email, region")
        .eq("id", user!.id)
        .single();
      setForm((prev) => ({
        ...prev,
        email: data?.email || user?.email || "",
        region: data?.region || "",
      }));
    };
    fetchUser();
  }, []);

  const finalizeOnboarding = useCallback(async () => {
    try {
      // Enforce name present and valid before finalization
      if (!isNameValid(form.name)) {
        toast.error("Enter a valid, non-offensive name.");
        setStep(2);
        return;
      }
      const safeName = sanitizeName(form.name);
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Not signed in");
        return;
      }
      // Ensure client role exists (avoid duplicates)
      const { data: roleRows, error: rolesErr } = await supabase
        .from("user_roles")
        .select("id")
        .eq("user_id", user.id)
        .eq("role", "client");
      if (rolesErr) {
        toast.error("Unable to verify roles");
        return;
      }
      if (!roleRows || roleRows.length === 0) {
        const { error: userRoleError } = await supabase
          .from("user_roles")
          .insert({ user_id: user.id, role: "client" });
        if (userRoleError) {
          toast.error("Failed to assign client role");
          return;
        }
      }

      // Build update payload without wiping existing values when empty
      const updatePayload: Record<string, unknown> = {
        has_completed_onboarding: true,
      };
      if (safeName) updatePayload.name = safeName;
      if (form.region) updatePayload.region = form.region;

      const { error: userError } = await supabase
        .from("users")
        .update(updatePayload)
        .eq("id", user.id);
      if (userError) {
        toast.error("Failed to save profile");
        return;
      }

      // Legacy profile role compatibility (best-effort)
      await supabase
        .from("profiles")
        .update({ role: "client" })
        .eq("id", user.id);

      // Award badge and notify user (best-effort)
      await supabase.from("badges").insert([
        {
          user_id: user.id,
          badge: "Welcome Aboard",
          earned_at: new Date().toISOString(),
        },
      ]);
      await supabase.from("notifications").insert({
        user_id: user.id,
        content: "You earned the 'Welcome Aboard' badge!",
      });

      // Persist active role for server middleware alignment
      try {
        document.cookie = `activeRole=client; Path=/; Max-Age=${
          60 * 60 * 24 * 30
        }; SameSite=Lax`;
        if (typeof window !== "undefined") {
          localStorage.setItem("activeRole", "client");
        }
      } catch {}

      toast.success("Onboarding completed!");
      router.push("/client/dashboard");
    } catch (e: unknown) {
      const msg =
        e instanceof Error
          ? e.message
          : "Unexpected error finishing onboarding";
      console.error(e);
      toast.error(msg);
    }
  }, [form.name, form.region, router, isNameValid, sanitizeName]);

  const handleNext = async () => {
    if (step === 2) {
      const raw = (form.name || "").trim();
      if (!raw) {
        setNameError("Name is required.");
        toast("Name is compulsory.", { icon: "⚠️" });
        return;
      }
      if (!isNameValid(form.name)) {
        setNameError("Please enter a valid, non-offensive name.");
        toast.error("Please enter a valid, non-offensive name.");
        return;
      }
      setNameError("");
      if (!form.region) {
        setRegionError("Region is required.");
        toast("Please select your region.", { icon: "⚠️" });
        return;
      } else {
        setRegionError("");
      }
    }
    if (step < 4) setStep(step + 1);
    else {
      // Final check of required fields
      const missing: string[] = [];
      if (!isNameValid(form.name)) missing.push("Name");
      if (!form.region) missing.push("Region");
      if (missing.length) {
        // Focus users back to Personal Info
        setStep(2);
        if (!form.region) setRegionError("Region is required.");
        if (!form.name.trim()) setNameError("Name is required.");
        toast(`Please complete required fields: ${missing.join(", ")}.`, {
          icon: "⚠️",
        });
        return;
      }
      setIsSubmitting(true);
      try {
        await finalizeOnboarding();
      } finally {
        setIsSubmitting(false);
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
            onChange={(e) => {
              const v = e.target.value;
              setForm({ ...form, name: v });
              if (!v.trim()) {
                setNameError("Name is required.");
              } else if (!isNameValid(v)) {
                setNameError("Please enter a valid, non-offensive name.");
              } else {
                setNameError("");
              }
            }}
            aria-invalid={!!nameError}
            aria-describedby={nameError ? "name-error" : undefined}
            className={`w-full rounded-md ${
              nameError
                ? "border-red-500 focus:ring-red-500 focus:border-red-500"
                : "border-gray-300 dark:border-gray-600"
            }`}
          />
          {nameError && (
            <p id="name-error" className="text-sm text-red-600 mt-1">
              {nameError}
            </p>
          )}
          <input
            type="email"
            placeholder="Email"
            value={form.email}
            disabled
            className="w-full rounded-md border-gray-300 dark:border-gray-600"
          />
          <select
            value={form.region}
            onChange={(e) => {
              const v = e.target.value;
              setForm({ ...form, region: v });
              if (!v) setRegionError("Region is required.");
              else setRegionError("");
            }}
            aria-invalid={!!regionError}
            aria-describedby={regionError ? "region-error" : undefined}
            className={`w-full rounded-md ${
              regionError
                ? "border-red-500 focus:ring-red-500 focus:border-red-500"
                : "border-gray-300 dark:border-gray-600"
            }`}
            required
          >
            <option value="">Select Region</option>
            <option value="Regional">Regional Queensland</option>
            <option value="Metro">Metro Queensland</option>
          </select>
          {regionError && (
            <p id="region-error" className="text-sm text-red-600 mt-1">
              {regionError}
            </p>
          )}
        </div>
      )}
      {step === 3 && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Step 3: Payment Method</h2>
          <Elements stripe={stripePromise}>
            <PaymentForm
              onSuccess={async () => {
                setForm({ ...form, paymentMethod: "Card Added" });
              }}
            />
          </Elements>
          <p className="text-sm text-gray-600">
            3.33% commission per milestone (
            {form.region === "Regional" ? "capped at A$25" : "no cap"}).
          </p>
          <Button
            variant="outline"
            onClick={() => {
              setForm({ ...form, paymentMethod: "Skipped" });
              setStep(4);
            }}
            className="w-full"
          >
            Skip for now
          </Button>
        </div>
      )}
      {step === 4 && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Step 4: Confirmation</h2>
          <p>Name: {form.name}</p>
          <p>Email: {form.email}</p>
          <p>Region: {form.region}</p>
          <p>Payment Method: {form.paymentMethod}</p>
          <div className="mt-4 p-4 bg-blue-100 rounded">
            <p className="font-bold">Go Premium for A$99/year!</p>
            <p>Enjoy 1.67% commission and priority job matching.</p>
            <Link href="/premium">
              <Button>Learn More</Button>
            </Link>
          </div>
        </div>
      )}
      <Button onClick={handleNext} className="w-full" isLoading={isSubmitting}>
        {step === 4 ? "Finish" : "Next"}
      </Button>
    </div>
  );
}
