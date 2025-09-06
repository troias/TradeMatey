"use client";

import React, { useState } from "react";
import { Button, Card } from "@/components/ui";
import { toast } from "react-hot-toast";

export default function IssueModal({
  open,
  onClose,
  milestoneId,
  prefilledReason,
}: {
  open: boolean;
  onClose: () => void;
  milestoneId: string;
  prefilledReason?: string;
}) {
  const [reason, setReason] = useState(prefilledReason || "");
  const [loading, setLoading] = useState(false);

  if (!open) return null;

  const submit = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/disputes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ milestoneId, reason }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Failed to create dispute");
      toast.success("Dispute filed; support will be notified");
      onClose();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      toast.error(msg || "Failed to file dispute");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <Card className="w-full max-w-lg p-6">
        <h3 className="text-lg font-semibold">Report an issue</h3>
  <p className="text-sm text-gray-600 mt-2">Explain what is wrong with the milestone.</p>
  <label className="sr-only" htmlFor="issue-reason">Issue reason</label>
  <textarea id="issue-reason" value={reason} onChange={(e) => setReason(e.target.value)} className="w-full mt-3 p-2 border rounded h-32" placeholder="Describe the issue..." />
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="outline" onClick={onClose} disabled={loading}>Cancel</Button>
          <Button onClick={submit} disabled={loading}>{loading ? 'Submitting...' : 'Submit issue'}</Button>
        </div>
      </Card>
    </div>
  );
}
