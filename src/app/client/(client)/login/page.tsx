"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { FaEye, FaEyeSlash, FaGoogle, FaEnvelope } from "react-icons/fa";
import { createClient } from "@/lib/supabase/client";
import { toast } from "react-hot-toast";
import { Button } from "@/components/ui/Button";

export default function ClientLoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [magicLinkSent, setMagicLinkSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [mfaRequired, setMfaRequired] = useState(false);
  const [mfaCode, setMfaCode] = useState("");
  const [factorId, setFactorId] = useState("");
  const router = useRouter();
  const supabase = useMemo(() => {
    try {
      const client = createClient();
      const maybe: unknown = client;
      if (!maybe || typeof maybe !== "object" || !("auth" in maybe)) {
        throw new Error("Supabase client missing auth");
      }
      return client as typeof client;
    } catch (e) {
      console.error("Supabase init failed", e);
      return null;
    }
  }, []);

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      if (!supabase) throw new Error("Supabase not configured");
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;

      const { data: factors } = await supabase.auth.mfa.listFactors();
      if (factors?.totp?.length) {
        const id = factors.totp[0].id;
        setFactorId(id);
        setMfaRequired(true);

        const { error: mfaError } = await supabase.auth.mfa.challenge({
          factorId: id,
        });
        if (mfaError) throw mfaError;
      } else {
        toast.success("Login successful!");
        router.replace("/select-role?source=client");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Login failed";
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleMfaVerify = async () => {
    try {
      if (!supabase) throw new Error("Supabase not configured");
      const { error } = await supabase.auth.mfa.verify({
        factorId,
        code: mfaCode,
        challengeId: "pending-challenge-id", // TODO capture real challengeId
      } as unknown as Parameters<typeof supabase.auth.mfa.verify>[0]);
      if (error) throw error;
      toast.success("MFA verified!");
      setMfaRequired(false);
      router.replace("/select-role?source=client");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "MFA verify failed";
      setError(msg);
      toast.error(msg);
    }
  };

  const handleOAuthLogin = async () => {
    setLoading(true);
    try {
      if (!supabase) throw new Error("Supabase not configured");
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback?requested_role=client`,
          queryParams: { prompt: "select_account" },
        },
      });
      if (error) throw error;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Google auth failed";
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleMagicLink = async () => {
    setLoading(true);
    try {
      if (!supabase) throw new Error("Supabase not configured");
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback?requested_role=client`,
        },
      });
      if (error) throw error;
      setMagicLinkSent(true);
      toast.success("Magic link sent! Check your email.");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Magic link failed";
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-100 to-blue-300 dark:from-gray-800 dark:to-blue-900 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="absolute inset-0 opacity-10">
        <svg className="w-full h-full" viewBox="0 0 1000 1000">
          <path
            d="M0 0H1000V1000H0V0ZM500 500C600 500 700 400 700 300C700 200 600 100 500 100C400 100 300 200 300 300C300 400 400 500 500 500Z"
            fill="url(#gradient)"
          />
          <defs>
            <linearGradient id="gradient" x1="0" y1="0" x2="1000" y2="1000">
              <stop offset="0%" stopColor="#2196F3" />
              <stop offset="100%" stopColor="#FF9800" />
            </linearGradient>
          </defs>
        </svg>
      </div>

      <motion.div
        className="relative bg-white dark:bg-gray-800 p-8 rounded-lg shadow-lg w-full max-w-md"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <h2 className="text-3xl font-bold text-center">Client Login</h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-4 text-center">
          Sign in to post jobs with secure milestone payments (3.33% commission,
          A$25 cap in regional Queensland).
        </p>

        {magicLinkSent ? (
          <div className="text-center space-y-4 mt-6">
            <FaEnvelope className="text-blue-600 mx-auto" size={40} />
            <p>
              Check <span className="font-bold">{email}</span> for your magic
              link.
            </p>
            <button
              onClick={() => setMagicLinkSent(false)}
              className="text-blue-600 hover:underline"
            >
              Try Another Method
            </button>
          </div>
        ) : (
          <>
            {error && <p className="text-red-500 text-center">{error}</p>}
            {!supabase && (
              <p className="text-red-500 text-center text-sm">
                Supabase client failed to initialize. Check
                NEXT_PUBLIC_SUPABASE_URL & NEXT_PUBLIC_SUPABASE_ANON_KEY.
              </p>
            )}

            <form onSubmit={handleEmailLogin} className="space-y-4 mt-6">
              <div>
                <label className="block text-sm font-medium">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full p-2 border rounded"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium">Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full p-2 border rounded"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2 top-2"
                  >
                    {showPassword ? <FaEyeSlash /> : <FaEye />}
                  </button>
                </div>
              </div>

              {mfaRequired && (
                <div>
                  <input
                    type="text"
                    value={mfaCode}
                    onChange={(e) => setMfaCode(e.target.value)}
                    placeholder="Enter 6-digit MFA code"
                    className="w-full p-2 border rounded"
                  />
                  <Button onClick={handleMfaVerify} className="w-full mt-2">
                    Verify MFA
                  </Button>
                </div>
              )}

              <Button type="submit" disabled={loading} className="w-full">
                {loading ? "Signing In..." : "Sign In with Email"}
              </Button>
            </form>

            <div className="my-4 text-center">Or</div>

            <div className="space-y-2">
              <Button
                onClick={handleOAuthLogin}
                disabled={loading}
                variant="outline"
                className="w-full flex items-center justify-center"
              >
                <FaGoogle className="mr-2" /> Google
              </Button>
              <Button
                onClick={handleMagicLink}
                disabled={loading || !email}
                variant="outline"
                className="w-full flex items-center justify-center"
              >
                <FaEnvelope className="mr-2" /> Magic Link
              </Button>
            </div>

            <div className="mt-4 text-center space-y-2">
              <p>
                No account?{" "}
                <Link href="/client/register" className="text-blue-600">
                  Register
                </Link>
              </p>
              <p>
                Forgot password?
                <Link href="/client/reset-password" className="text-blue-600">
                  Reset
                </Link>
              </p>
            </div>
          </>
        )}
      </motion.div>
    </div>
  );
}
