"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function ConfirmDeletePage() {
  const router = useRouter();
  const params = useSearchParams();
  const email = params?.get("email") || "";
  const userId = params?.get("id") || "";

  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    // Check Supabase client session; redirect to admin login if not signed in.
    (async () => {
      try {
        const { createClient } = await import("@/lib/supabase/client");
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) {
          const back = encodeURIComponent(window.location.href);
          router.push(`/admin/login?next=${back}`);
        }
      } catch {
        // If anything goes wrong, send user to login — server will enforce auth anyway.
        const back = encodeURIComponent(window.location.href);
        router.push(`/admin/login?next=${back}`);
      }
    })();
  }, [router]);

  async function handleDelete(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    try {
      const idempotencyKey = crypto.randomUUID();
      const res = await fetch("/api/admin/ui/delete", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-idempotency-key": idempotencyKey,
          // surface hints HubSpot CRM card initiated the action
          "x-surface": "hubspot_crm_card",
        },
        body: JSON.stringify({ externalUserId: userId, email, reason }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMessage(data?.error || `Failed: ${res.status}`);
      } else {
        setMessage("User marked deleted — action recorded.");
      }
    } catch (err: unknown) {
      const msg =
        err && typeof err === "object" && "message" in err
          ? String((err as { message?: unknown }).message ?? "")
          : String(err);
      setMessage(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-3xl mx-auto py-12">
      <h2 className="text-2xl font-semibold mb-4">Confirm delete user</h2>
      <p className="text-sm text-gray-600 mb-6">
        Email: <strong>{email}</strong>
      </p>
      <form onSubmit={handleDelete} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Reason (required)
          </label>
          <textarea
            required
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2"
            rows={4}
          />
        </div>
        <div className="flex items-center space-x-3">
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-60"
          >
            {loading ? "Processing…" : "Confirm delete"}
          </button>
          <button
            type="button"
            onClick={() => router.back()}
            className="px-4 py-2 bg-gray-200 rounded-md"
          >
            Cancel
          </button>
        </div>
        {message ? <p className="text-sm mt-2">{message}</p> : null}
      </form>
    </div>
  );
}
