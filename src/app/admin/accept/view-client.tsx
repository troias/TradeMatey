"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function AcceptClient({ token }: { token: string }) {
  const router = useRouter();
  const [status, setStatus] = useState<
    "idle" | "loading" | "error" | "success"
  >("idle");
  const [message, setMessage] = useState<string>("");

  async function accept() {
    if (!token) return;
    setStatus("loading");
    const res = await fetch("/api/admin/accept", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setStatus("error");
      setMessage(data?.error || "Failed to accept invite");
      return;
    }
    setStatus("success");
    router.replace("/admin/dashboard");
  }

  useEffect(() => {
    accept();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  return (
    <div className="max-w-md mx-auto p-6">
      <h1 className="text-xl font-semibold mb-3">Accept admin invitation</h1>
      {status === "error" && <p className="text-red-600 mb-3">{message}</p>}
      {status === "loading" && <p className="mb-3">Accepting…</p>}
      <button
        onClick={accept}
        className="px-4 py-2 rounded bg-black text-white hover:bg-neutral-800"
        disabled={status === "loading"}
      >
        Accept and continue
      </button>
      <p className="text-sm text-neutral-600 mt-3">
        If you aren’t signed in yet, you’ll be asked to sign in first.
      </p>
    </div>
  );
}
