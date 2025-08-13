"use client";

import { useAuth } from "@/components/Providers";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";

function SelectRoleInner() {
  const { user, userRoles, setRole } = useAuth();
  const router = useRouter();
  const search = useSearchParams();
  const source = search.get("source"); // "client" or "tradie" when coming from a specific portal

  if (!user) return <div className="p-6">Please sign in.</div>;

  const hasTradie = userRoles.includes("tradie");
  const hasClient = userRoles.includes("client");

  const onChoose = (role: "tradie" | "client") => {
    if ((role === "tradie" && hasTradie) || (role === "client" && hasClient)) {
      setRole(role);
      router.push(
        role === "tradie" ? "/tradie/dashboard" : "/client/dashboard"
      );
    } else {
      // If user doesn't have this role yet, send to onboarding
      router.push(
        role === "tradie" ? "/tradie/onboarding" : "/client/onboarding"
      );
    }
  };

  return (
    <div className="min-h-[60vh] flex items-center justify-center p-6">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 max-w-md w-full">
        <h1 className="text-2xl font-bold mb-4">Choose your role</h1>
        <p className="text-sm text-gray-600 dark:text-gray-300 mb-6">
          Pick which workspace to open. {source ? `(from ${source} login)` : ""}
        </p>
        <div className="space-y-3">
          {/* Tradie option */}
          <button
            onClick={() => onChoose("tradie")}
            className={`w-full py-2 rounded border transition ${
              hasTradie
                ? "border-blue-600 text-blue-700 hover:bg-blue-50"
                : "border-blue-300 text-blue-500 hover:bg-blue-25"
            }`}
          >
            {hasTradie ? "Continue as Tradie" : "Become a Tradie (Onboarding)"}
          </button>
          {/* Client option */}
          <button
            onClick={() => onChoose("client")}
            className={`w-full py-2 rounded border transition ${
              hasClient
                ? "border-emerald-600 text-emerald-700 hover:bg-emerald-50"
                : "border-emerald-300 text-emerald-600 hover:bg-emerald-25"
            }`}
          >
            {hasClient ? "Continue as Client" : "Become a Client (Onboarding)"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function SelectRolePage() {
  return (
    <Suspense>
      <SelectRoleInner />
    </Suspense>
  );
}
