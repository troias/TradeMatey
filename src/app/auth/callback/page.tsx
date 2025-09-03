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
          // Fallback to legacy users.roles array when user_roles table is empty
          if (!roles || roles.length === 0) {
            try {
              const { data: userRow } = await supabase
                .from("users")
                .select("roles")
                .eq("id", user.id)
                .maybeSingle();
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const legacyRoles = (userRow as any)?.roles as
                | string[]
                | undefined;
              if (legacyRoles && legacyRoles.length) {
                roles = legacyRoles;
              }
            } catch {
              // ignore fallback failure
            }
          }

          // support both legacy `as` and `requested_role` params used by login pages
          const requestedRole =
            searchParams.get("requested_role") || searchParams.get("as");
          const desiredPrimary =
            requestedRole === "tradie" || requestedRole === "client"
              ? requestedRole
              : null;

          const inviteToken = searchParams.get("invite_token");

          const hasPrimary = roles.some(
            (r) => r === "tradie" || r === "client"
          );

          // If user explicitly requested a role (eg. tradie) and they don't have it,
          // attempt to add it. For tradie, require onboarding before granting.
          if (desiredPrimary && !roles.includes(desiredPrimary)) {
            if (desiredPrimary === "tradie") {
              if (hasCompletedOnboarding) {
                try {
                  await supabase.rpc("ensure_primary_role", {
                    p_user_id: user.id,
                    p_role: "tradie",
                  });
                  const { data: rolesData2 } = await supabase
                    .from("user_roles")
                    .select("role")
                    .eq("user_id", user.id);
                  roles = (rolesData2 || []).map(
                    (r: { role: string }) => r.role
                  );
                  // persist active role choice for Providers to pick up after redirect
                  try {
                    if (typeof window !== "undefined") {
                      window.localStorage.setItem("activeRole", "tradie");
                      document.cookie = `activeRole=${encodeURIComponent(
                        "tradie"
                      )}; Path=/; Max-Age=2592000; SameSite=Lax`;
                    }
                  } catch {}
                } catch {
                  // fallthrough to selection
                }
              } else {
                router.replace("/tradie/onboarding");
                return;
              }
            } else if (desiredPrimary === "client") {
              try {
                await supabase.rpc("ensure_primary_role", {
                  p_user_id: user.id,
                  p_role: "client",
                });
                const { data: rolesData2 } = await supabase
                  .from("user_roles")
                  .select("role")
                  .eq("user_id", user.id);
                roles = (rolesData2 || []).map((r: { role: string }) => r.role);
                try {
                  if (typeof window !== "undefined") {
                    window.localStorage.setItem("activeRole", "client");
                    document.cookie = `activeRole=${encodeURIComponent(
                      "client"
                    )}; Path=/; Max-Age=2592000; SameSite=Lax`;
                  }
                } catch {}
              } catch {
                // ignore
              }
            }
          }

          // If user has no primary role even after attempted assignment, send to select-role
          if (
            !hasPrimary &&
            !roles.some((r) => r === "tradie" || r === "client")
          ) {
            router.replace("/select-role");
            return;
          }

          // If the user explicitly requested to act as a tradie and doesn't yet
          // have the tradie role, either add it immediately (if onboarding done)
          // or redirect them into onboarding.
          if (desiredPrimary === "tradie" && !roles.includes("tradie")) {
            if (hasCompletedOnboarding) {
              try {
                // Use the DB RPC which is idempotent and refreshes the legacy users.roles
                await supabase.rpc("ensure_primary_role", {
                  p_user_id: user.id,
                  p_role: "tradie",
                });
                // Re-read roles from user_roles (RPC will have run refresh_user_roles_array)
                const { data: rolesData3 } = await supabase
                  .from("user_roles")
                  .select("role")
                  .eq("user_id", user.id);
                roles = (rolesData3 || []).map((r: { role: string }) => r.role);
                router.replace("/tradie/dashboard");
                return;
              } catch {
                // If RPC fails (permissions/policy), route the user to onboarding/selection
                router.replace("/select-role");
                return;
              }
            } else {
              router.replace("/tradie/onboarding");
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
            try {
              if (typeof window !== "undefined") {
                window.localStorage.setItem("activeRole", "tradie");
                document.cookie = `activeRole=${encodeURIComponent(
                  "tradie"
                )}; Path=/; Max-Age=2592000; SameSite=Lax`;
              }
            } catch {}
            router.replace(
              hasCompletedOnboarding
                ? "/tradie/dashboard"
                : "/tradie/onboarding"
            );
            return;
          }
          if (roles.includes("client")) {
            try {
              if (typeof window !== "undefined") {
                window.localStorage.setItem("activeRole", "client");
                document.cookie = `activeRole=${encodeURIComponent(
                  "client"
                )}; Path=/; Max-Age=2592000; SameSite=Lax`;
              }
            } catch {}
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
