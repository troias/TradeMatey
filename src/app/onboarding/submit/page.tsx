"use client";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useState } from "react";

export default function Onboarding() {
  const { data: session } = useSession();
  const router = useRouter();
  const [role, setRole] = useState<"tradie" | "client" | null>(null);

  const handleContinue = async () => {
    if (!role) return;
    await fetch("/api/user/update-role", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: session?.user?.email, role }),
    });
    router.push("/dashboard");
  };

  return (
    <div className="max-w-xl mx-auto py-16 px-6 space-y-8 text-center">
      <h1 className="text-4xl font-bold text-gray-900">Welcome</h1>
      <p className="text-gray-600">Choose your role to get started</p>
      <div className="flex justify-center space-x-4">
        <button
          onClick={() => setRole("tradie")}
          className={`px-6 py-3 rounded-lg font-semibold transition ${
            role === "tradie"
              ? "bg-blue-600 text-white"
              : "bg-white border border-gray-300"
          }`}
        >
          I’m a Tradie
        </button>
        <button
          onClick={() => setRole("client")}
          className={`px-6 py-3 rounded-lg font-semibold transition ${
            role === "client"
              ? "bg-blue-600 text-white"
              : "bg-white border border-gray-300"
          }`}
        >
          I’m a Client
        </button>
      </div>
      <button
        onClick={handleContinue}
        className="mt-6 w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 transition"
      >
        Continue
      </button>
    </div>
  );
}
