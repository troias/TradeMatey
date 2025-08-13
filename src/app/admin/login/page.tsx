"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Card } from "@/components/ui";

export default function AdminLoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const { createClient } = await import("@/lib/supabase/client");
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (user) {
          // check admin role; if already admin, go to dashboard
          const { data: roles } = await supabase
            .from("user_roles")
            .select("role")
            .eq("user_id", user.id);
          const isAdmin = (roles || []).some(
            (r: { role: string }) => r.role === "admin"
          );
          if (isAdmin) {
            router.replace("/admin/dashboard");
            return;
          }
        }
      } catch {}
    })();
  }, [router]);

  const signInWithMagicLink = async (email: string) => {
    setLoading(true);
    setError(null);
    try {
      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithOtp({ email });
      if (error) throw error;
      router.replace("/auth/callback");
    } catch {
      setError("Failed to start login.");
    } finally {
      setLoading(false);
    }
  };

  const startGoogle = async () => {
    setLoading(true);
    setError(null);
    try {
      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: `${window.location.origin}/auth/callback` },
      });
      if (error) throw error;
      if (data?.url) window.location.href = data.url;
    } catch {
      setError("Google sign-in failed.");
      setLoading(false);
    }
  };

  const [email, setEmail] = useState("");

  return (
    <div className="min-h-[60vh] flex items-center justify-center p-6">
      <Card className="p-6 max-w-md w-full space-y-4">
        <h1 className="text-2xl font-bold">Admin Login</h1>
        <p className="text-sm text-gray-600">
          Only authorized admins can continue.
        </p>
        <input
          type="email"
          placeholder="you@company.com"
          className="w-full border rounded px-3 py-2"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <Button
          disabled={loading || !email}
          onClick={() => signInWithMagicLink(email)}
        >
          {loading ? "Sending..." : "Send magic link"}
        </Button>
        <div className="h-px bg-gray-200" />
        <Button disabled={loading} onClick={startGoogle}>
          Continue with Google
        </Button>
        {error && <p className="text-red-600 text-sm">{error}</p>}
        <p className="text-xs text-gray-500">
          Note: After sign-in, access to admin pages still requires the admin
          role.
        </p>
      </Card>
    </div>
  );
}
