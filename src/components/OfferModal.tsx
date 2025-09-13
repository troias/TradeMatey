"use client";

import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui";
import { createClient as createBrowserClient } from "@/lib/supabase/client";
import { toast } from "react-hot-toast";

type JobRow = {
  id: string;
  title: string;
  milestones?: { id: string; title: string }[];
};

export default function OfferModal({
  tradieId,
  clientId,
  onClose,
}: {
  tradieId: string;
  clientId?: string | null;
  onClose: () => void;
}) {
  const [jobs, setJobs] = useState<JobRow[]>([]);
  const [resolvedClientId, setResolvedClientId] = useState<string | null>(
    clientId || null
  );
  const [selectedJob, setSelectedJob] = useState<string | "">("");
  const [selectedMilestone, setSelectedMilestone] = useState<string | "">("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await fetch(`/api/clients/jobs`);
        if (!res.ok) return;
        const data = await res.json();
        if (!mounted) return;
        if (Array.isArray(data)) setJobs(data as JobRow[]);
      } catch {
        // ignore
      }
    })();
    // Resolve client id from browser supabase if not provided
    (async () => {
      if (!resolvedClientId) {
        try {
          const supabase = createBrowserClient();
          const { data } = await supabase.auth.getUser();
          if (data?.user) {
            setResolvedClientId(data.user.id);
          }
        } catch {
          // ignore
        }
      }
    })();
    return () => {
      mounted = false;
    };
  }, [resolvedClientId]);

  const onSubmit = async () => {
    const senderId = resolvedClientId || clientId;
    if (!senderId) return toast.error("You must be signed in to send an offer");
    setLoading(true);
    try {
      const payload: {
        tradie_id: string;
        client_id: string;
        job_id?: string;
        milestone_id?: string;
        message?: string;
      } = {
        tradie_id: tradieId,
        client_id: senderId,
      };
      if (selectedJob) payload.job_id = selectedJob;
      if (selectedMilestone) payload.milestone_id = selectedMilestone;
      if (message) payload.message = message;

      const res = await fetch("/api/offers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        credentials: "include",
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || "Failed to send offer");
      toast.success("Offer sent");
      onClose();
    } catch (err: unknown) {
      console.error(err);
      toast.error((err as Error)?.message || "Failed to send offer");
    } finally {
      setLoading(false);
    }
  };

  const selectedJobObj = jobs.find((j) => j.id === selectedJob) || null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-lg bg-white dark:bg-gray-900 rounded p-6">
        <h3 className="text-lg font-semibold mb-3">Offer job to tradie</h3>
        <div className="space-y-3">
          <div>
            <label htmlFor="offer-job" className="sr-only">
              Select a job (optional)
            </label>
            <select
              value={selectedJob}
              id="offer-job"
              onChange={(e) => {
                setSelectedJob(e.target.value);
                setSelectedMilestone("");
              }}
              className="w-full p-2 border rounded mt-1"
            >
              <option value="">-- choose a job --</option>
              {jobs.map((j) => (
                <option key={j.id} value={j.id}>
                  {j.title}
                </option>
              ))}
            </select>
          </div>

          {selectedJobObj && (
            <div>
              <label htmlFor="offer-milestone" className="sr-only">
                Milestone (optional)
              </label>
              <select
                value={selectedMilestone}
                id="offer-milestone"
                onChange={(e) => setSelectedMilestone(e.target.value)}
                className="w-full p-2 border rounded mt-1"
              >
                <option value="">-- choose a milestone --</option>
                {(selectedJobObj.milestones || []).map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.title}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label htmlFor="offer-message" className="sr-only">
              Message (optional)
            </label>
            <textarea
              id="offer-message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="w-full p-2 border rounded mt-1 h-24"
            />
          </div>

          <div className="flex gap-2 justify-end">
            <Button onClick={onClose} variant="outline" disabled={loading}>
              Cancel
            </Button>
            <Button onClick={onSubmit} disabled={loading}>
              {loading ? "Sending..." : "Send Offer"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
