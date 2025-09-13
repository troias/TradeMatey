"use client";

import { useState, useEffect, use } from "react";
import Link from "next/link";
import { Card } from "@/components/ui";
import { useQuery } from "@tanstack/react-query";
import { toast } from "react-hot-toast";
import { createClient } from "@/lib/supabase/client";

type Interest = {
  id: string;
  tradie_id?: string | null;
  status?: string | null;
  accepted_at?: string | null;
  milestone_id?: string | null;
};

type Milestone = {
  id: string;
  title: string;
  amount?: number;
  created_at?: string | null;
  tradie_id?: string | null;
  status?: string;
};

type JobRow = {
  id: string;
  title: string;
  description?: string;
  budget?: number;
  status?: string;
  payment_type?: string;
  created_at?: string | null;
  milestones?: Milestone[];
  _meta?: { interests?: Interest[] };
};

declare global {
  interface Window {
    __E2E_TEST_SEED_TOKEN?: string;
    __E2E_AUTH?: { userId?: string };
  }
}

export default function JobDetails({
  params,
}: {
  params?: { id?: string } | Promise<{ id?: string }>;
}) {
  // params may be a Promise in App Router; unwrap with React.use() to avoid sync-access
  // cast to unknown first to satisfy the 'Usable' typing expected by React.use
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore-next-line
  const unwrappedParams = use(
    params as unknown as { id?: string } | Promise<{ id?: string }>
  );
  const jobId = unwrappedParams?.id ?? "";
  const [job, setJob] = useState<JobRow | null>(null);
  const [interests, setInterests] = useState<Interest[] | null>(null);

  const { data, error, isLoading, refetch } = useQuery({
    queryKey: ["job", jobId],
    queryFn: async () => {
      const res = await fetch(`/api/jobs?job_id=${jobId}`);
      if (!res.ok) throw new Error("Failed to fetch job");
      return res.json();
    },
  });

  useEffect(() => {
    if (Array.isArray(data) && data.length > 0) {
      const row = data[0];
      setJob(row);
      if (row._meta?.interests) setInterests(row._meta.interests);
    }
    if (error && (error as Error).message)
      toast.error((error as Error).message);
  }, [data, error]);

  // attempt to set auth user id from Supabase or E2E test hook if present,
  // but we don't rely on the value for rendering timestamps so keep minimal
  useEffect(() => {
    const supabase = createClient();
    let mounted = true;
    (async () => {
      try {
        const { data: userData } = await supabase.auth.getUser();
        if (mounted && !userData?.user && typeof window !== "undefined") {
          // If server didn't provide a user, Playwright e2e may set a window hook
          if (window.__E2E_AUTH?.userId) {
            // noop: we intentionally don't store it unless needed elsewhere
          }
        }
      } catch {
        // ignore errors from auth in test/dev
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const acceptTradie = async (tradieId: string) => {
    if (!jobId) return;
    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (typeof window !== "undefined" && window.__E2E_TEST_SEED_TOKEN) {
        headers["x-test-seed-token"] = window.__E2E_TEST_SEED_TOKEN;
      }
      const res = await fetch("/api/jobs/accept", {
        method: "POST",
        headers,
        body: JSON.stringify({ job_id: jobId, tradie_id: tradieId }),
        credentials: "include",
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || "Accept failed");
      toast.success("Tradie accepted");
      await refetch();
    } catch (err: unknown) {
      console.error(err);
      toast.error("Accept failed");
    }
  };

  if (!job && isLoading)
    return <div className="text-center py-10">Loading...</div>;
  if (!job) return <div className="text-center py-10">Job not found</div>;

  const milestones = job.milestones || [];

  return (
    <div className="space-y-6">
      <div className="flex items-baseline justify-between">
        <h1 className="text-3xl font-bold">{job.title}</h1>
        {job.created_at && (
          <div className="text-sm text-gray-500">
            Posted: {new Date(job.created_at).toLocaleString()}
          </div>
        )}
      </div>

      <Card className="p-6">
        <p>Description: {job.description}</p>
        <p>Budget: ${job.budget}</p>
        <p>Status: {job.status}</p>

        {job.payment_type === "milestone" && (
          <div className="mt-4">
            <h2 className="font-semibold">Milestones</h2>
            <ul className="mt-2 space-y-2">
              {milestones.map((m: Milestone) => {
                const accepted = (interests || []).find(
                  (i: Interest) =>
                    i.milestone_id === m.id || i.tradie_id === m.tradie_id
                );
                return (
                  <li key={m.id} className="p-2 border rounded">
                    <Link
                      href={`/client/job/${jobId}/milestone/${m.id}`}
                      className="font-medium underline"
                    >
                      {m.title}
                    </Link>
                    <div className="text-xs text-gray-600">
                      {m.created_at && (
                        <div>
                          Created: {new Date(m.created_at).toLocaleString()}
                        </div>
                      )}
                      {accepted && accepted.accepted_at && (
                        <div>
                          Assigned:{" "}
                          {new Date(accepted.accepted_at).toLocaleString()}
                        </div>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        <div className="mt-6">
          <h3 className="font-semibold">Tradies interested</h3>
          {(interests || []).length === 0 && (
            <div className="text-sm text-gray-500">No activity yet</div>
          )}
          {(interests || []).map((it: Interest) => (
            <div
              key={it.id}
              className="flex justify-between items-center p-2 border rounded mt-2"
            >
              <div>
                <div className="font-medium">Tradie: {it.tradie_id}</div>
                <div className="text-xs">
                  Status: {it.status || "interested"}
                </div>
                {it.accepted_at && (
                  <div className="text-xs">
                    Accepted: {new Date(it.accepted_at).toLocaleString()}
                  </div>
                )}
              </div>
              <div>
                {it.status === "accepted" ? (
                  <span className="text-green-600">Accepted</span>
                ) : (
                  <button
                    onClick={() => it.tradie_id && acceptTradie(it.tradie_id)}
                    disabled={!it.tradie_id}
                    className="px-3 py-1 bg-blue-600 text-white rounded disabled:opacity-50"
                  >
                    Accept
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
