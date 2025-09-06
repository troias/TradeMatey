"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { Card } from "@/components/ui";
import MilestoneBadge from "@/components/MilestoneBadge";
import { useQuery } from "@tanstack/react-query";
import { toast } from "react-hot-toast";
import { createClient } from "@/lib/supabase/client";

type Milestone = {
  id: string;
  title?: string;
  status?: string;
  amount?: number;
};

type Job = {
  id?: string;
  title?: string;
  description?: string;
  budget?: number;
  status?: string;
  payment_type?: string;
  client_id?: string | null;
  milestones?: Milestone[];
};

type ParamsObject = Record<string, string>;
type ParamsProp = ParamsObject | Promise<ParamsObject> | undefined;

export default function JobDetails({ params }: { params?: ParamsProp }) {
  // helper to extract id from a possibly-unknown params object
  const getIdFromParams = (p?: ParamsProp): string | null => {
    if (!p) return null;
    if (typeof p === "object" && !(p instanceof Promise)) {
      const obj = p as ParamsObject;
      return typeof obj.id === "string" ? obj.id : null;
    }
    return null;
  };

  // Type guard to detect a Promise-like params value
  const isPromiseParams = (p?: ParamsProp): p is Promise<ParamsObject> => {
    return (
      !!p && typeof (p as unknown as { then?: unknown }).then === "function"
    );
  };

  // params may be a Promise in newer Next.js versions when streaming.
  // Resolve it safely in an effect and avoid direct sync access like `params.id`.
  const [resolvedId, setResolvedId] = useState<string | null>(
    getIdFromParams(params)
  );

  const [job, setJob] = useState<Job | null>(null);
  const [interests, setInterests] = useState<
    | {
        id: string;
        job_id: string;
        tradie_id: string;
        status?: string;
        accepted_at?: string;
      }[]
    | null
  >(null);

  useEffect(() => {
    if (resolvedId) return; // already resolved

    // If params is a Promise (thenable), await it and extract id.
    if (isPromiseParams(params)) {
      let mounted = true;
      (async () => {
        try {
          const p = (await params) as ParamsObject | undefined;
          if (mounted && p && typeof p.id === "string") setResolvedId(p.id);
        } catch (e) {
          console.debug(e);
        }
      })();
      return () => {
        mounted = false;
      };
    }

    // If params is already an object but id wasn't set above, set it now.
    if (params && typeof (params as ParamsObject).id === "string")
      setResolvedId((params as ParamsObject).id);
  }, [params, resolvedId]);

  const { data, error, isLoading, refetch } = useQuery({
    queryKey: ["job", resolvedId],
    enabled: !!resolvedId,
    queryFn: async () => {
      if (!resolvedId) return null;
      const res = await fetch(`/api/jobs?job_id=${resolvedId}`);
      if (!res.ok) {
        const text = await res.text().catch(() => "Failed to fetch job");
        throw new Error(text || "Failed to fetch job");
      }
      return res.json();
    },
  });

  const [authUserId, setAuthUserId] = useState<string | null>(null);
  useEffect(() => {
    const supabase = createClient();
    let mounted = true;
    (async () => {
      try {
        const { data: userData } = await supabase.auth.getUser();
        if (mounted) setAuthUserId(userData?.user?.id ?? null);
      } catch (e) {
        console.debug("failed to get user", e);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const acceptTradie = async (tradieId: string) => {
    if (!resolvedId) return;
    try {
      const res = await fetch("/api/jobs/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ job_id: resolvedId, tradie_id: tradieId }),
        credentials: "include",
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || "Accept failed");
      toast.success("Tradie accepted");
      // refresh job data
      await refetch();
    } catch (err: unknown) {
      console.error(err);
      let msg = String(err);
      if (typeof err === "object" && err !== null && "message" in err) {
        const maybe = err as { message?: unknown };
        if (typeof maybe.message === "string") msg = maybe.message as string;
      }
      toast.error(msg || "Accept failed");
    }
  };

  useEffect(() => {
    if (Array.isArray(data) && (data as unknown[]).length > 0) {
      type JobRowAug = Job & {
        _meta?: {
          interests?: {
            id: string;
            job_id: string;
            tradie_id: string;
            status?: string;
            accepted_at?: string;
          }[];
          viewCount?: number;
        };
      };
      const row = (data as unknown[])[0] as JobRowAug;
      // job returned by API may include _meta with interests and viewCount
      if (row._meta?.interests) setInterests(row._meta.interests);
      setJob(row as Job);
    }
    if (error && (error as Error).message)
      toast.error((error as Error).message);
  }, [data, error]);

  if (!resolvedId) return <div className="text-center py-10">Loading...</div>;
  if (isLoading) return <div className="text-center py-10">Loading...</div>;
  if (!job) return <div className="text-center py-10">Job not found</div>;
  const milestones = job.milestones || [];
  // current milestone = first milestone that is not completed or verified
  const currentMilestoneIndex = milestones.findIndex(
    (m) => m.status !== "completed" && m.status !== "verified"
  );

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
        {job.title}
      </h1>
      <Card className="p-6 shadow-lg">
        <p className="text-gray-600 dark:text-gray-400">
          Description: {job.description}
        </p>
        <p className="text-gray-600 dark:text-gray-400">
          Budget: ${job.budget}
        </p>
        <p className="text-gray-600 dark:text-gray-400">Status: {job.status}</p>
        <p className="text-gray-600 dark:text-gray-400">
          Payment Type: {job.payment_type}
        </p>
        {job.payment_type === "milestone" && (
          <>
            <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mt-4">
              Milestones
            </h2>
            <motion.ul
              className="mt-2 space-y-3"
              initial="hidden"
              animate="visible"
              variants={{
                hidden: {},
                visible: { transition: { staggerChildren: 0.06 } },
              }}
            >
              {milestones.map((milestone, idx) => {
                const isCurrent = idx === currentMilestoneIndex;
                const baseClass = `p-3 rounded-lg `;
                const statusClass =
                  milestone.status === "completed"
                    ? "bg-yellow-100 dark:bg-yellow-800 border border-yellow-200"
                    : milestone.status === "verified"
                    ? "bg-green-100 dark:bg-green-800 border border-green-200"
                    : isCurrent
                    ? "bg-green-100 dark:bg-green-800 ring-1 ring-green-200"
                    : "bg-gray-50 dark:bg-gray-800";
                return (
                  <motion.li
                    key={milestone.id}
                    className={baseClass + statusClass}
                    variants={{
                      hidden: { opacity: 0, y: 8 },
                      visible: { opacity: 1, y: 0 },
                    }}
                    whileHover={{ scale: 1.02 }}
                    transition={{ type: "spring", stiffness: 260, damping: 20 }}
                  >
                    <div className="flex justify-between items-center">
                      <div>
                        <Link
                          href={`/client/job/${resolvedId}/milestone/${milestone.id}`}
                          className="underline font-semibold text-lg"
                        >
                          {milestone.title}
                        </Link>
                        <div className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-3 mt-1">
                          <MilestoneBadge
                            status={milestone.status}
                            isCurrent={isCurrent}
                            size={isCurrent ? "lg" : "md"}
                          />
                          <span>
                            Status: {milestone.status} • ${milestone.amount}
                          </span>
                        </div>
                      </div>
                      <div>
                        {milestone.status === "completed" && (
                          <div className="text-xs text-orange-600">
                            QBCC: 14 days to start
                          </div>
                        )}
                        {milestone.status === "verified" && (
                          <div className="text-xs text-emerald-600">Paid</div>
                        )}
                        {isCurrent &&
                          milestone.status !== "verified" &&
                          milestone.status !== "completed" && (
                            <div className="text-xs text-emerald-600">
                              Current
                            </div>
                          )}
                      </div>
                    </div>
                  </motion.li>
                );
              })}
            </motion.ul>
          </>
        )}

        {/* Tradie interest / acceptance */}
        <div className="mt-4">
          <h3 className="text-lg font-semibold">Tradies interested</h3>
          {!interests && (
            <div className="text-sm text-gray-500">No activity yet</div>
          )}
          {interests && (
            <ul className="mt-2 space-y-2">
              {interests.map((it) => (
                <li
                  key={it.id}
                  className="flex justify-between items-center p-2 bg-gray-50 dark:bg-gray-800 rounded"
                >
                  <div>
                    <div className="font-medium">Tradie: {it.tradie_id}</div>
                    <div className="text-xs text-gray-500">
                      Status: {it.status || "interested"}
                    </div>
                  </div>
                  <div>
                    {it.status === "accepted" ? (
                      <span className="text-sm text-green-600">Accepted</span>
                    ) : authUserId && job.client_id === authUserId ? (
                      <button
                        onClick={() => acceptTradie(it.tradie_id)}
                        className="px-3 py-1 bg-blue-600 text-white rounded"
                      >
                        Accept
                      </button>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </Card>
    </div>
  );
}
