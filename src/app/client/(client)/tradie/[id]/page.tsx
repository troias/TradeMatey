"use client";

import React, { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button, Card } from "@/components/ui";
import { useQuery } from "@tanstack/react-query";
import { toast } from "react-hot-toast";

export default function TradieProfile({
  params,
}: {
  params: { id?: string } | Promise<{ id?: string }>;
}) {
  // `params` may be a Promise in newer Next.js versions. Resolve it in an
  // effect and avoid synchronous property access like `params.id` which
  // triggers a dev-time warning; see `client/job/[id]/page.tsx` for the
  // robust pattern.
  const [resolvedId, setResolvedId] = useState<string | null>(
    // If params is a plain object, extract id synchronously
    params && typeof params === "object" && !(params instanceof Promise)
      ? (params as { id?: string }).id ?? null
      : null
  );

  const [tradie, setTradie] = useState<unknown>(null);

  useEffect(() => {
    if (resolvedId) return; // already resolved
    let mounted = true;
    // If params is a thenable, await and extract id
    if (
      params &&
      typeof (params as unknown as { then?: unknown }).then === "function"
    ) {
      (async () => {
        try {
          const p = (await params) as { id?: string } | undefined;
          if (mounted && p && typeof p.id === "string") setResolvedId(p.id);
        } catch {
          // swallow — we'll show not found / loading as appropriate
        }
      })();
    }
    return () => {
      mounted = false;
    };
  }, [params, resolvedId]);

  const { data, error, isLoading } = useQuery({
    queryKey: ["tradie", resolvedId],
    enabled: !!resolvedId,
    queryFn: async () => {
      if (!resolvedId) return null;
      const res = await fetch(`/api/tradies?user_id=${resolvedId}`);
      if (!res.ok) throw new Error("Failed to fetch tradie");
      return res.json();
    },
  });

  useEffect(() => {
    if (data && Array.isArray(data) && data.length > 0) setTradie(data[0]);
    if (error) toast.error((error as Error).message);
  }, [data, error]);

  if (isLoading) return <div className="text-center py-10">Loading...</div>;
  if (!tradie) return <div className="text-center py-10">Tradie not found</div>;

  const t = tradie as Record<string, unknown>;
  const tradieId = (t.id as string) ?? (t.user_id as string) ?? undefined;

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
        {(t.name as string) ?? "Tradie"}
      </h1>
      <div className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow-lg">
        <p className="text-gray-600 dark:text-gray-400">
          Trade:{" "}
          {Array.isArray(t.skills) && (t.skills[0] as string)
            ? (t.skills[0] as string).replace("_", " ")
            : "-"}
        </p>
        <p className="text-gray-600 dark:text-gray-400">
          Rating:{" "}
          {typeof (t.ratings as Record<string, unknown>)?.average === "number"
            ? String((t.ratings as Record<string, unknown>).average)
            : "N/A"}
        </p>
        <p className="text-gray-600 dark:text-gray-400">
          Region: {(t.location as string) ?? "-"}
        </p>
        {(t.top_tradie as boolean) && (
          <p className="text-green-600 dark:text-green-400">Top Tradie ✅</p>
        )}

        <div className="mt-4 flex gap-3">
          <Button onClick={() => alert("Contact functionality coming soon!")}>
            Contact Tradie
          </Button>
          <OfferJobButton tradieId={tradieId} />
        </div>
      </div>
    </div>
  );
}

function OfferJobButton({ tradieId }: { tradieId?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button onClick={() => setOpen(true)} disabled={!tradieId}>
        Offer job
      </Button>
      {open && (
        <OfferJobModal tradieId={tradieId!} onClose={() => setOpen(false)} />
      )}
    </>
  );
}

function OfferJobModal({
  tradieId,
  onClose,
}: {
  tradieId: string;
  onClose: () => void;
}) {
  type Milestone = { id: string; title: string; amount?: number };
  type Job = { id: string; title: string; milestones?: Milestone[] };

  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  // selections: map job_id -> { entire: boolean, milestones: string[] }
  const [selections, setSelections] = useState<
    Record<string, { entire: boolean; milestones: string[] }>
  >({});
  const [confirmOpen, setConfirmOpen] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const supabase = createClient();
        const { data: userResp } = await supabase.auth.getUser();
        const clientId = userResp?.user?.id;
        if (!clientId) throw new Error("Not authenticated");
        const res = await fetch(`/api/clients/jobs?client_id=${clientId}`);
        if (!res.ok) throw new Error("Failed to load jobs");
        const json = await res.json();
        setJobs(json.jobs || []);
      } catch {
        toast.error("Failed to load your jobs");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function submitOffer() {
    try {
      const supabase = createClient();
      const { data: userResp } = await supabase.auth.getUser();
      const clientId = userResp?.user?.id;
      if (!clientId) throw new Error("Not authenticated");

      // Build offers array from selections
      const offers: Array<{
        tradie_id: string;
        client_id: string;
        job_id?: string;
        milestone_id?: string | null;
      }> = [];
      for (const [jobId, sel] of Object.entries(selections || {})) {
        if (sel.entire) {
          offers.push({
            tradie_id: tradieId,
            client_id: clientId,
            job_id: jobId,
          });
        }
        for (const msId of sel.milestones || []) {
          offers.push({
            tradie_id: tradieId,
            client_id: clientId,
            job_id: jobId,
            milestone_id: msId,
          });
        }
      }

      if (offers.length === 0) throw new Error("No selections made");

      const res = await fetch("/api/offers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ offers }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Failed to send offers");
      toast.success("Offers sent");
      onClose();
    } catch (e) {
      toast.error((e as Error).message || "Failed to send offers");
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <Card className="w-full max-w-2xl p-6">
        <h3 className="text-lg font-semibold">
          Offer this tradie a job or milestone
        </h3>
        <div className="mt-4">
          {loading ? (
            <div>Loading your jobs...</div>
          ) : jobs.length === 0 ? (
            <div>No jobs found. Create a job first.</div>
          ) : (
            <div className="space-y-3">
              {jobs.map((job) => (
                <div key={job.id} className="border p-3 rounded">
                  <div className="font-medium">{job.title}</div>
                  <div className="mt-2 grid gap-2">
                    <label className="text-sm">Offer entire job</label>
                    <input
                      type="checkbox"
                      name={`offer-entire-${job.id}`}
                      aria-label={`Offer entire job ${job.title}`}
                      checked={!!selections[job.id]?.entire}
                      onChange={(e) => {
                        setSelections((s) => {
                          const next = { ...(s || {}) };
                          if (!next[job.id])
                            next[job.id] = { entire: false, milestones: [] };
                          if (e.target.checked) {
                            // select entire job, clear milestones
                            next[job.id].entire = true;
                            next[job.id].milestones = [];
                          } else {
                            next[job.id].entire = false;
                          }
                          return next;
                        });
                      }}
                    />
                    <div className="mt-2">Milestones:</div>
                    {(Array.isArray(job.milestones) ? job.milestones : []).map(
                      (ms: Milestone) => (
                        <div key={ms.id} className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            name={`offer-ms-${job.id}-${ms.id}`}
                            aria-label={`Offer milestone ${ms.title} from job ${job.title}`}
                            checked={
                              selections[job.id]?.milestones?.includes(ms.id) ??
                              false
                            }
                            disabled={!!selections[job.id]?.entire}
                            onChange={(e) => {
                              const checked = e.target.checked;
                              setSelections((s) => {
                                const next = { ...(s || {}) };
                                if (!next[job.id])
                                  next[job.id] = {
                                    entire: false,
                                    milestones: [],
                                  };
                                // selecting a milestone cancels whole-job selection
                                if (checked) {
                                  next[job.id].entire = false;
                                  if (!next[job.id].milestones.includes(ms.id))
                                    next[job.id].milestones = [
                                      ...next[job.id].milestones,
                                      ms.id,
                                    ];
                                } else {
                                  next[job.id].milestones = next[
                                    job.id
                                  ].milestones.filter((id) => id !== ms.id);
                                }
                                return next;
                              });
                            }}
                          />
                          <div className="text-sm">
                            {ms.title} — A${Number(ms.amount || 0).toFixed(2)}
                          </div>
                        </div>
                      )
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={() => setConfirmOpen(true)}
            disabled={Object.values(selections || {}).every(
              (s) => !s.entire && (!s.milestones || s.milestones.length === 0)
            )}
          >
            Send Offer
          </Button>
        </div>
      </Card>
      {confirmOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-gray-900 rounded-lg p-6 w-full max-w-lg">
            <h4 className="font-semibold text-lg mb-3">Confirm offers</h4>
            <div className="max-h-64 overflow-auto mb-4 space-y-2">
              {Object.entries(selections).map(([jobId, sel]) => {
                const job = jobs.find((j) => j.id === jobId);
                return (
                  <div key={jobId} className="border p-3 rounded">
                    <div className="font-medium">
                      {job?.title ?? `Job: ${jobId}`}
                    </div>
                    {sel.entire ? (
                      <div className="text-sm">Entire job selected</div>
                    ) : null}
                    {sel.milestones && sel.milestones.length > 0 ? (
                      <ul className="text-sm list-disc pl-5">
                        {sel.milestones.map((m) => {
                          const ms = job?.milestones?.find(
                            (x) => x.id === (m as string)
                          );
                          return <li key={m}>{ms?.title ?? m}</li>;
                        })}
                      </ul>
                    ) : null}
                  </div>
                );
              })}
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setConfirmOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={async () => {
                  await submitOffer();
                  setConfirmOpen(false);
                }}
              >
                Confirm & Send
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
