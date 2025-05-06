"use client";

import { signIn } from "next-auth/react";
import { FcGoogle } from "react-icons/fc";
import { useState } from "react";

export default function SignIn() {
  const [loading, setLoading] = useState(false);

  const handleGoogleSignIn = async () => {
    try {
      setLoading(true);
      await signIn("google", { callbackUrl: "/auth/post-signin" });
    } catch (error) {
      console.error("Sign-in error:", error);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-2xl shadow-xl text-center">
        <h1 className="text-4xl font-bold text-gray-900">
          Join as a Tradie or Client
        </h1>
        <p className="text-gray-600">
          We’ll tailor your experience based on your role
        </p>

        <button
          onClick={handleGoogleSignIn}
          disabled={loading}
          className="w-full flex items-center justify-center bg-blue-600 text-white py-3 rounded-lg text-lg font-semibold hover:bg-blue-700 transition disabled:opacity-60"
        >
          <FcGoogle className="mr-3 text-2xl" />
          {loading ? "Signing in..." : "Get Started with Google"}
        </button>
      </div>
    </div>
  );
}
