"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-hot-toast";
import { Card, Button } from "@/components/ui";
import IssueModal from "@/components/IssueModal";
import EarlyPayModal from "@/components/EarlyPayModal";
import { loadStripe } from "@stripe/stripe-js";
import {
  Elements,
  CardElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";

type SavedMethod = { id: string; card: { last4: string; brand?: string } };

const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!
);

type ParamsObject = Record<string, string>;
type ParamsProp = ParamsObject | Promise<ParamsObject> | undefined;
type Props = { params?: ParamsProp };

export default function MilestonePage({ params }: Props) {
  // Safely resolve params which may be a Promise in newer Next.js versions
  const [resolvedParams, setResolvedParams] = useState<ParamsObject | null>(
    typeof params === "object" &&
      params !== null &&
      !(params instanceof Promise)
      ? (params as ParamsObject)
      : null
  );

  const jobId = resolvedParams?.id ?? null;
  const mid = resolvedParams?.mid ?? null;
  const [milestone, setMilestone] = useState<unknown | null>(null);
  const [savedMethods, setSavedMethods] = useState<SavedMethod[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [earlyPayOpen, setEarlyPayOpen] = useState(false);
  const [earlyPayResolve, setEarlyPayResolve] = useState<
    ((v: boolean) => void) | null
  >(null);
  const [issueOpen, setIssueOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    // If params was passed as a thenable, resolve it and set resolvedParams
    if (
      !resolvedParams &&
      params &&
      typeof (params as { then?: unknown }).then === "function"
    ) {
      let mounted = true;
      (async () => {
        try {
          const p = (await params) as ParamsObject | undefined;
          if (mounted && p) setResolvedParams(p);
        } catch {
          // ignore param errors when resolving params
        }
      })();
      return () => {
        mounted = false;
      };
    }

    if (!jobId || !mid) return;
    let mounted = true;
    (async () => {
      try {
        const res = await fetch(`/api/milestones?milestone_id=${mid}`);
        if (!res.ok) throw new Error("Failed to load milestone");
        const data = await res.json();
        if (mounted) setMilestone(data);
      } catch (e) {
        console.error(e);
        toast.error("Failed to load milestone");
      }
    })();
    return () => {
      mounted = false;
    };
  }, [params, resolvedParams, jobId, mid]);

  useEffect(() => {
    // fetch saved payment methods for user
    let mounted = true;
    (async () => {
      try {
        const res = await fetch(`/api/payments/methods`);
        if (!res.ok) return;
        const json = await res.json();
        if (mounted && json?.methods) setSavedMethods(json.methods);
      } catch {
        // ignore
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  function PaymentWidget({ amount }: { amount: number }) {
    const stripe = useStripe();
    const elements = useElements();
    const [busy, setBusy] = useState(false);

    const handlePay = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!mid) return;
      // Prevent payment if milestone has no assigned tradie
      const assignedTradie = (milestone as Record<string, unknown>)
        ?.tradie_id as string | undefined;
      if (!assignedTradie) {
        toast.error("Milestone has no assigned tradie");
        return;
      }
      setBusy(true);
      try {
        // If milestone wasn't requested by tradie (status !== 'pending'), show early-pay modal
        const mStatus = (milestone as Record<string, unknown>)?.status as
          | string
          | undefined;
        let forcePay = false;
        if (mStatus !== "pending") {
          // open modal and await result
          forcePay = await new Promise<boolean>((resolve) => {
            setEarlyPayResolve(() => resolve);
            setEarlyPayOpen(true);
          });
        }

        // if user declined early-pay, abort
        if (mStatus !== "pending" && !forcePay) {
          toast.error("Payment cancelled");
          return;
        }

        // create PaymentIntent server-side (returns clientSecret)
        const res = await fetch("/api/payments", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            milestoneId: mid,
            amount,
            force_pay_early: forcePay,
          }),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json?.error || "Failed to create payment");
        const clientSecret = json.clientSecret;
        if (!stripe || !elements) throw new Error("Stripe not loaded");
        const card = elements.getElement(CardElement);
        // call confirmCardPayment if available, using unknown-safe checks
        const stripeWithConfirm = stripe as unknown as {
          confirmCardPayment?: (...args: unknown[]) => Promise<unknown>;
        };
        if (typeof stripeWithConfirm.confirmCardPayment === "function") {
          const result = (await stripeWithConfirm.confirmCardPayment(
            clientSecret,
            { payment_method: { card: card! } }
          )) as Record<string, unknown> | undefined;
          const confirmError = result?.error as Error | undefined;
          const paymentIntent = result?.paymentIntent as
            | Record<string, unknown>
            | undefined;
          if (confirmError) throw confirmError;
          if (
            paymentIntent &&
            (paymentIntent.status as string) === "succeeded"
          ) {
            toast.success("Payment completed");
            router.back();
          } else {
            toast.error("Payment did not complete");
          }
        } else {
          toast.error("Payment confirmation not available");
        }
      } catch (err: unknown) {
        console.error(err);
        const msg = err instanceof Error ? err.message : String(err);
        toast.error(msg || "Payment failed");
      } finally {
        setBusy(false);
      }
    };

    return (
      <form onSubmit={handlePay} className="space-y-3">
        <CardElement />
        <Button type="submit" disabled={busy || !stripe}>
          {busy ? "Processing..." : `Pay A$${amount.toFixed(2)}`}
        </Button>
      </form>
    );
  }

  async function handleQuickPay(methodId: string) {
    if (!mid) return;
    // Prevent quick-pay if milestone has no assigned tradie
    const assignedTradie = (milestone as Record<string, unknown>)?.tradie_id as
      | string
      | undefined;
    if (!assignedTradie) {
      toast.error("Milestone has no assigned tradie");
      return;
    }
    setLoading(true);
    try {
      // If milestone not pending, confirm early pay
      const mStatus = (milestone as Record<string, unknown>)?.status as
        | string
        | undefined;
      let forcePay = false;
      if (mStatus !== "pending") {
        forcePay = await new Promise<boolean>((resolve) => {
          setEarlyPayResolve(() => resolve);
          setEarlyPayOpen(true);
        });
        if (!forcePay) {
          toast.error("Payment cancelled");
          return;
        }
      }

      const res = await fetch(`/api/payments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          milestoneId: mid,
          amount: Number((milestone as Record<string, unknown>)?.amount ?? 0),
          useSaved: true,
          paymentMethodId: methodId,
          force_pay_early: forcePay,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Quick pay failed");
      // If payment was confirmed server-side, we're done
      toast.success("Payment completed");
      router.back();
    } catch (err: unknown) {
      console.error(err);
      const msg = err instanceof Error ? err.message : String(err);
      toast.error(msg || "Payment failed");
    } finally {
      setLoading(false);
    }
  }

  if (!jobId || !mid) return <div className="p-6">Invalid milestone link</div>;
  if (!milestone) return <div className="p-6">Loading milestone...</div>;

  const m = milestone as Record<string, unknown>;
  const mTitle = (m.title as string) ?? "Milestone";
  const mStatus = (m.status as string) ?? "unknown";
  const mAmount =
    typeof m.amount === "number" ? m.amount : Number(m.amount || 0);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold">{mTitle}</h1>
      <Card className="mt-4 p-4">
        <div>Status: {mStatus}</div>
        <div>Amount: ${mAmount}</div>
        <div className="mt-2 text-sm text-gray-700">
          {m.tradie_id ? (
            <div>
              <strong>Assigned tradie:</strong>{" "}
              {(m.tradie_name as string) || (m.tradie_id as string)}
            </div>
          ) : (
            <div>
              <strong>Assigned tradie:</strong> None
            </div>
          )}
        </div>
        <div className="mt-4 space-y-4">
          <div className="flex justify-end">
            <Button variant="outline" onClick={() => setIssueOpen(true)}>
              Raise issue
            </Button>
          </div>
          {m.tradie_id ? (
            savedMethods && savedMethods.length > 0 ? (
              <div className="flex items-center gap-3">
                <div className="flex-1">
                  <div className="text-sm text-muted-foreground">
                    Pay with saved card
                  </div>
                  <div className="mt-1 font-medium">
                    **** **** **** {savedMethods[0].card.last4}
                  </div>
                </div>
                <div>
                  <Button
                    onClick={() => handleQuickPay(savedMethods[0].id)}
                    disabled={loading}
                  >
                    {loading ? "Processing..." : `Pay A$${mAmount.toFixed(2)}`}
                  </Button>
                </div>
              </div>
            ) : null
          ) : (
            <div className="text-sm text-gray-500">
              Payment options available once a tradie is assigned to this
              milestone.
            </div>
          )}

          {m.tradie_id ? (
            <div>
              <Elements stripe={stripePromise}>
                <PaymentWidget amount={mAmount} />
              </Elements>
            </div>
          ) : null}
        </div>
      </Card>
      <IssueModal
        open={issueOpen}
        onClose={() => setIssueOpen(false)}
        milestoneId={mid!}
      />
      <EarlyPayModal
        open={earlyPayOpen}
        onCancel={() => {
          setEarlyPayOpen(false);
          if (earlyPayResolve) earlyPayResolve(false);
          setEarlyPayResolve(null);
        }}
        onConfirm={() => {
          setEarlyPayOpen(false);
          if (earlyPayResolve) earlyPayResolve(true);
          setEarlyPayResolve(null);
        }}
      />
    </div>
  );
}
