"use client";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function AuthCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);

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
          // Check onboarding status in public.users
          const { data, error } = await supabase
            .from("users")
            .select("has_completed_onboarding")
            .eq("id", user.id)
            .single();
          if (error) {
            setError("Failed to check onboarding status.");
            return;
          }
          if (data?.has_completed_onboarding) {
            router.replace("/tradie/dashboard");
          } else {
            router.replace("/tradie/onboarding");
          }
        } else {
          setError("You must be logged in to access the dashboard.");
        }
      } catch (e: any) {
        setError("Authentication check failed.");
      }
    })();
  }, [router, searchParams]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      {error ? (
        <p className="text-red-500">Authentication failed: {error}</p>
      ) : (
        <p>Authenticating... Please wait.</p>
      )}
    </div>
  );
}
