"use client";

import { signIn } from "next-auth/react";
import { FcGoogle } from "react-icons/fc";

export default function SignIn() {
  const handleGoogleSignIn = async () => {
    try {
      await signIn("google");
    } catch (error) {
      console.error("Sign-in error:", error);
    }
  };

  return (
    <div className="max-w-md mx-auto py-12 px-6 bg-white rounded-xl shadow-lg space-y-8">
      <h1 className="text-4xl font-extrabold text-center text-gray-900 mb-6">
        Sign In
      </h1>
      <button
        onClick={handleGoogleSignIn}
        className="w-full flex items-center justify-center bg-blue-600 text-white text-lg font-medium py-3 rounded-lg hover:bg-blue-700 transition-colors duration-200"
      >
        <FcGoogle className="mr-4 text-2xl" />
        Sign in with Google
      </button>
      <div className="flex justify-center mt-4">
        <span className="text-sm text-gray-600">
          Or sign in with another method
        </span>
      </div>
    </div>
  );
}
