"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { FaEye, FaEyeSlash, FaGoogle, FaEnvelope } from "react-icons/fa";
import { createClient } from "@/lib/supabase/client";
import { toast } from "react-hot-toast";
import { Button } from "@/components/ui/Button";

export default function TradieLoginPage() {
  const supabase = createClient();
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

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
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
        router.replace("/select-role?source=tradie");
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
      // NOTE: Supabase MFA verify requires challengeId; store from challenge response if implementing fully.
      const tempParams: {
        factorId: string;
        code: string;
        challengeId: string;
      } = {
        factorId,
        code: mfaCode,
        challengeId: "pending-challenge-id", // TODO: store real challengeId from challenge response
      };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase.auth.mfa.verify as any)(tempParams); // temporary until challengeId wiring
      if (error) throw error;
      toast.success("MFA verified!");
      setMfaRequired(false);
      router.replace("/select-role?source=tradie");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "MFA verify failed";
      setError(msg);
      toast.error(msg);
    }
  };

  const handleOAuthLogin = async () => {
    setLoading(true);
    try {
      // Force Google to always show account chooser (even if only one) so user can switch accounts.
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback?requested_role=tradie`,
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
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback?requested_role=tradie`,
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
    <div className="min-h-screen bg-gradient-to-br from-gray-100 to-gray-300 dark:from-gray-800 dark:to-gray-900 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="absolute inset-0 opacity-10">
        <svg className="w-full h-full" viewBox="0 0 1000 1000">
          <path
            d="M0 0H1000V1000H0V0ZM500 500C600 500 700 400 700 300C700 200 600 100 500 100C400 100 300 200 300 300C300 400 400 500 500 500Z"
            fill="url(#gradient)"
          />
          <defs>
            <linearGradient id="gradient" x1="0" y1="0" x2="1000" y2="1000">
              <stop offset="0%" stopColor="#2563EB" />
              <stop offset="100%" stopColor="#FBBF24" />
            </linearGradient>
          </defs>
        </svg>
      </div>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="relative bg-white dark:bg-gray-800 p-6 sm:p-8 md:p-10 rounded-xl shadow-2xl w-full max-w-md sm:max-w-lg z-10"
      >
        <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 dark:text-gray-100 mb-6 text-center">
          Tradie Login
        </h1>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-4 text-center">
          Sign in to access jobs with secure milestone payments (3.33%
          commission, 1.67% for top tradies) and QBCC compliance. Verify your
          license during onboarding.
        </p>
        {magicLinkSent ? (
          <div className="text-center space-y-4">
            <FaEnvelope
              className="text-blue-600 dark:text-blue-400 mx-auto"
              size={40}
            />
            <p className="text-gray-600 dark:text-gray-400">
              Check <span className="font-semibold">{email}</span> for your
              magic link.
            </p>
            <button
              onClick={() => setMagicLinkSent(false)}
              className="text-blue-600 dark:text-blue-400 hover:underline"
            >
              Try Another Method
            </button>
          </div>
        ) : (
          <>
            {error && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-red-500 mb-4 text-center"
              >
                {error}
              </motion.p>
            )}
            <form onSubmit={handleEmailLogin} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-1 block w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-gray-100 transition duration-300"
                  required
                />
              </div>
              <div className="relative">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Password
                </label>
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="mt-1 block w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-gray-100 transition duration-300"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-10 text-gray-500 dark:text-gray-400"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <FaEyeSlash size={20} />
                  ) : (
                    <FaEye size={20} />
                  )}
                </button>
              </div>
              {mfaRequired && (
                <div className="mt-4">
                  <input
                    type="text"
                    value={mfaCode}
                    onChange={(e) => setMfaCode(e.target.value)}
                    placeholder="Enter 6-digit MFA code"
                    className="w-full p-2 border rounded"
                  />
                  <Button onClick={handleMfaVerify} className="mt-2 w-full">
                    Verify MFA
                  </Button>
                </div>
              )}
              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-700"
              >
                {loading ? "Signing In..." : "Sign In with Email"}
              </Button>
            </form>
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300 dark:border-gray-600"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400">
                  Or continue with
                </span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Button
                onClick={handleOAuthLogin}
                disabled={loading}
                variant="outline"
                className="flex items-center justify-center"
              >
                <FaGoogle className="mr-2 text-red-500" /> Google
              </Button>
              <Button
                onClick={handleMagicLink}
                disabled={loading || !email}
                variant="outline"
                className="flex items-center justify-center"
              >
                <FaEnvelope className="mr-2 text-blue-500" /> Magic Link
              </Button>
            </div>
            <div className="mt-6 text-center space-y-2">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                New to TradeMatey?{" "}
                <Link
                  href="/tradie/register"
                  className="text-blue-600 dark:text-blue-400 hover:underline"
                >
                  Register
                </Link>
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Forgot password?{" "}
                <Link
                  href="/tradie/reset-password"
                  className="text-blue-600 dark:text-blue-400 hover:underline"
                >
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
