"use client";

import { useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

export default function PostSignIn() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "authenticated") {
      const { role, hasProfile } = session.user;

      // Validate role explicitly (must be "tradie" or "client")
      const validRoles = ["tradie", "client"];
      const isValidRole = validRoles.includes(role ?? "");

      if (hasProfile && isValidRole) {
        router.replace("/dashboard");
      } else {
        router.replace("/onboarding");
      }
    }
  }, [session, status, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center space-y-4 px-6">
        <Loader2 className="animate-spin mx-auto text-blue-600 w-10 h-10" />
        <h1 className="text-2xl font-bold text-gray-800">Setting things up…</h1>
        <p className="text-gray-500">
          Just a moment while we get your experience ready.
        </p>
      </div>
    </div>
  );
}
