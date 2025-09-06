"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { motion } from "framer-motion";
import { Card, Button } from "@/components/ui";
import MilestoneBadge from "@/components/MilestoneBadge";
import { useQuery } from "@tanstack/react-query";
import { toast } from "react-hot-toast";

export default function TradieJobDetails({
  params,
}: {
  params: { id: string };
}) {
  const [job, setJob] = useState<any>(null);
  const { data, error, isLoading } = useQuery({
    queryKey: ["job", params.id],
    queryFn: async () => {
      const res = await fetch(`/api/jobs?job_id=${params.id}`);
      if (!res.ok) throw new Error("Failed to fetch job");
      return res.json();
    },
  });

  useEffect(() => {
    if (data && data.length > 0) setJob(data[0]);
    if (error) toast.error(error.message);
  }, [data, error]);

  if (isLoading) return <div className="text-center py-10">Loading...</div>;
  if (!job) return <div className="text-center py-10">Job not found</div>;

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
              className="mt-3 space-y-3"
              initial="hidden"
              animate="visible"
              variants={{
                hidden: {},
                visible: { transition: { staggerChildren: 0.05 } },
              }}
            >
              {job.milestones.map((milestone: any) => (
                <motion.li
                  key={milestone.id}
                  className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg flex justify-between items-center"
                  variants={{
                    hidden: { opacity: 0, y: 8 },
                    visible: { opacity: 1, y: 0 },
                  }}
                  whileHover={{ scale: 1.02 }}
                  transition={{ type: "spring", stiffness: 260, damping: 20 }}
                >
                  <div>
                    <div className="font-semibold text-lg">
                      {milestone.title}
                    </div>
                    <div className="text-sm text-gray-500">
                      ${milestone.amount}
                    </div>
                    <div className="mt-1">
                      <MilestoneBadge
                        status={milestone.status}
                        size="sm"
                        isCurrent={
                          milestone.status !== "completed" &&
                          milestone.status !== "verified"
                        }
                      />
                    </div>
                  </div>
                  <div>
                    {milestone.status !== "completed" &&
                    milestone.status !== "verified" ? (
                      <Button
                        onClick={async () => {
                          try {
                            const res = await fetch(
                              "/api/milestones/request-payment",
                              {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({
                                  milestone_id: milestone.id,
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
                        {milestone.status}
                      </div>
                    )}
                  </div>
                </motion.li>
              ))}
            </motion.ul>
          </>
        )}
      </Card>
    </div>
  );
}
