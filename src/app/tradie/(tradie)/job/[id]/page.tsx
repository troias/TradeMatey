"use client";

import { useState, useEffect } from "react";
import useParams from "@/lib/useParams";
// router was unused here
import { motion } from "framer-motion";
import { Card, Button } from "@/components/ui";
import MilestoneBadge from "@/components/MilestoneBadge";
import { useQuery } from "@tanstack/react-query";
import { toast } from "react-hot-toast";

export default function TradieJobDetails({
  params,
}: {
  params?: { id?: string } | Promise<{ id?: string }>;
}) {
  const [job, setJob] = useState<unknown>(null);
  const unwrapped = useParams<{ id?: string }>(params as any);
  const jobId = unwrapped?.id;

  const { data, error, isLoading } = useQuery({
    queryKey: ["job", jobId],
    queryFn: async () => {
      const res = await fetch(`/api/jobs?job_id=${jobId}`);
      if (!res.ok) throw new Error("Failed to fetch job");
      return res.json();
    },
  });

  useEffect(() => {
    if (data && Array.isArray(data) && data.length > 0) setJob(data[0]);
    if (error) toast.error((error as Error).message);
  }, [data, error]);

  if (isLoading) return <div className="text-center py-10">Loading...</div>;
  if (!job) return <div className="text-center py-10">Job not found</div>;

  const jb = job as Record<string, unknown>;

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
        {(jb.title as string) ?? ""}
      </h1>
      <Card className="p-6 shadow-lg">
        <p className="text-gray-600 dark:text-gray-400">
          Description: {(jb.description as string) ?? ""}
        </p>
        <p className="text-gray-600 dark:text-gray-400">
          Budget: ${Number(jb.budget ?? 0)}
        </p>
        <p className="text-gray-600 dark:text-gray-400">
          Status: {(jb.status as string) ?? ""}
        </p>
        <p className="text-gray-600 dark:text-gray-400">
          Payment Type: {(jb.payment_type as string) ?? ""}
        </p>
        {(jb.payment_type as string) === "milestone" && (
          <>
            <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mt-4">
              Milestones
            </h2>
            <motion.ul
              className="mt-3 space-y-3"
              initial="hidden"
              animate="visible"
              variants={{
                hidden: {},
                visible: { transition: { staggerChildren: 0.05 } },
              }}
            >
              {(Array.isArray(jb.milestones) ? jb.milestones : []).map(
                (milestone) => {
                  const ms = milestone as Record<string, unknown>;
                  const amount = Number(ms.amount ?? 0);
                  return (
                    <motion.li
                      key={(ms.id as string) ?? Math.random()}
                      className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg flex justify-between items-center"
                      variants={{
                        hidden: { opacity: 0, y: 8 },
                        visible: { opacity: 1, y: 0 },
                      }}
                      whileHover={{ scale: 1.02 }}
                      transition={{
                        type: "spring",
                        stiffness: 260,
                        damping: 20,
                      }}
                    >
                      <div>
                        <div className="font-semibold text-lg">
                          {(ms.title as string) ?? ""}
                        </div>
                        <div className="text-sm text-gray-500">${amount}</div>
                        <div className="mt-1">
                          <MilestoneBadge
                            status={(ms.status as string) ?? "unknown"}
                            size="sm"
                            isCurrent={
                              (ms.status as string) !== "completed" &&
                              (ms.status as string) !== "verified"
                            }
                          />
                        </div>
                      </div>
                      <div>
                        {(ms.status as string) !== "completed" &&
                        (ms.status as string) !== "verified" ? (
                          <Button
                            onClick={async () => {
                              try {
                                const res = await fetch(
                                  "/api/milestones/request-payment",
                                  {
                                    method: "POST",
                                    headers: {
                                      "Content-Type": "application/json",
                                    },
                                    body: JSON.stringify({
                                      milestone_id: ms.id,
                                    }),
                                    credentials: "include",
                                  }
                                );
                                const json = await res.json();
                                if (!res.ok)
                                  throw new Error(json?.error || "Failed");
                                toast.success(
                                  "Milestone marked complete — payment pending"
                                );
                                window.location.reload();
                              } catch (e) {
                                console.error(e);
                                toast.error("Failed to request payment");
                              }
                            }}
                          >
                            Request payment
                          </Button>
                        ) : (
                          <div className="text-sm text-gray-500">
                            {(ms.status as string) ?? ""}
                          </div>
                        )}
                      </div>
                    </motion.li>
                  );
                }
              )}
            </motion.ul>
          </>
        )}
      </Card>
    </div>
  );
}
