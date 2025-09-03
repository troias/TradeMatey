"use client";

import { useEffect, useState } from "react";

export default function AdminInvitesPage() {
  const [invites, setInvites] = useState<
    Array<{ token: string; email?: string }>
  >([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/invite?status=pending");
      const data = await res.json();
      if (Array.isArray(data)) {
        setInvites(data);
      } else {
        // API returned an error object or unexpected shape
        setInvites([]);
        setError(
          (data && (data.error || data.message)) ||
            "Unexpected response from server"
        );
      }
    } catch {
      setError("Failed to load invites");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function approve(token: string) {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/approve-invite", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const body = await res.json();
      if (!body?.ok) {
        const msg = body?.error || body?.message || "approve failed";
        throw new Error(msg);
      }
      await load();
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Pending Admin Invites</h1>
      {error && <p className="text-red-600">{error}</p>}
      {loading && <p>Loading...</p>}
      {!loading && invites.length === 0 && <p>No pending invites.</p>}
      <ul className="space-y-2">
        {invites.map((inv) => (
          <li
            key={inv.token}
            className="flex items-center justify-between border p-2 rounded"
          >
            <div>
              <div className="font-medium">{inv.email || "—"}</div>
              <div className="text-xs text-gray-500">token: {inv.token}</div>
            </div>
            <div>
              <button
                className="btn"
                onClick={() => approve(inv.token)}
                disabled={loading}
              >
                Approve
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
