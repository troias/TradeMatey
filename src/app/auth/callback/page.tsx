"use client";
import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function AuthCallbackInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [redeemStatus, setRedeemStatus] = useState<string | null>(null);

  useEffect(() => {
    const errorParam = searchParams.get("error");
    if (errorParam) {
      setError(errorParam);
      return;
    }
    // Check if user is logged in before redirecting
    (async () => {
      try {
        const { createClient } = await import("@/lib/supabase/client");
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (user) {
          // Try to read onboarding status; tolerate missing column or row
          let hasCompletedOnboarding = false;
          try {
            const { data: onboardingData, error: onboardingError } =
              await supabase
                .from("users")
                .select("has_completed_onboarding")
                .eq("id", user.id)
                .maybeSingle();
            if (!onboardingError && onboardingData) {
              hasCompletedOnboarding = Boolean(
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                (onboardingData as any).has_completed_onboarding
              );
            }
          } catch {
            // Ignore and leave as false; user will be routed to onboarding if tradie.
          }
          // Load roles for smarter redirect + ensure primary role
          const { data: rolesData } = await supabase
            .from("user_roles")
            .select("role")
            .eq("user_id", user.id);
          let roles = (rolesData || []).map((r: { role: string }) => r.role);

          const requested = searchParams.get("as");
          const desiredPrimary =
            requested === "tradie" || requested === "client" ? requested : null;

          const inviteToken = searchParams.get("invite_token");

          const hasPrimary = roles.some(
            (r) => r === "tradie" || r === "client"
          );
          if (!hasPrimary) {
            if (desiredPrimary) {
              // Only auto-assign a primary role when explicitly requested as 'client' or 'tradie'
              await supabase.rpc("ensure_primary_role", {
                p_user_id: user.id,
                p_role: desiredPrimary,
              });
              const { data: rolesData2 } = await supabase
                .from("user_roles")
                .select("role")
                .eq("user_id", user.id);
              roles = (rolesData2 || []).map((r: { role: string }) => r.role);
            } else {
              // No explicit requested primary role: don't default to 'client'.
              // Redirect users without a primary role to role selection to avoid
              // accidentally assigning sensitive roles (e.g. admin) implicitly.
              router.replace("/select-role");
              return;
            }
          }

          // Fire-and-forget CRM upsert (after ensuring primary)
          fetch("/api/crm/upsert", { method: "POST" }).catch(() => {});
          if (roles.includes("admin")) {
            if (inviteToken) {
              try {
                const res = await fetch("/api/admin/redeem-invite", {
                  method: "POST",
                  headers: { "content-type": "application/json" },
                  body: JSON.stringify({ token: inviteToken }),
                });
                const body: unknown = await res.json().catch(() => null);
                const okValue =
                  body &&
                  typeof (body as Record<string, unknown>).ok === "boolean"
                    ? (body as Record<string, unknown>).ok === true
                    : false;
                if (okValue) setRedeemStatus("Invite redeemed successfully");
                else setRedeemStatus("Invite redeem attempted");
              } catch {
                setRedeemStatus("Invite redeem failed");
              }
              // show redeem result for 1.2s then continue
              setTimeout(() => router.replace("/admin/dashboard"), 1200);
            } else {
              router.replace("/admin/dashboard");
            }
            return;
          }
          // If tradie role present
          if (roles.includes("tradie")) {
            router.replace(
              hasCompletedOnboarding
                ? "/tradie/dashboard"
                : "/tradie/onboarding"
            );
            return;
          }
          if (roles.includes("client")) {
            router.replace("/client/dashboard");
            return;
          }
          if (roles.length > 1) {
            router.replace("/select-role");
            return;
          }
          // Fallback
          router.replace("/");
        } else {
          setError("You must be logged in to access the dashboard.");
        }
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
      } catch (e) {
        setError("Authentication check failed.");
      }
    })();
  }, [router, searchParams]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      {error ? (
        <p className="text-red-500">Authentication failed: {error}</p>
      ) : redeemStatus ? (
        <p className="text-green-600">{redeemStatus}</p>
      ) : (
        <p>Authenticating... Please wait.</p>
      )}
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense>
      <AuthCallbackInner />
    </Suspense>
  );
}
