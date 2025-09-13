"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { Card } from "@/components/ui";
import { useQuery } from "@tanstack/react-query";
import { toast } from "react-hot-toast";

type Milestone = { id: string; title: string; status: string; amount: number };
type JobRow = { id: string; title: string; description?: string; budget?: number; status?: string; payment_type?: string; milestones?: Milestone[] };

export default function JobDetails({ params }: { params: Record<string, unknown> }) {
  const [job, setJob] = useState<JobRow | null>(null);
  const pathname = usePathname();
  const idFromPath = pathname?.split("/").filter(Boolean).pop();
  const routeId = (idFromPath as string) || (params && (params as { id?: string }).id);

  const { data, error, isLoading } = useQuery({
    queryKey: ["job", routeId],
    queryFn: async () => {
      if (!routeId) throw new Error("Missing job id");
      const res = await fetch(`/api/jobs?job_id=${routeId}`);
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
            <ul className="mt-2 space-y-2">
              {job.milestones?.map((milestone: Milestone) => (
                <li
                  key={milestone.id}
                  className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
                >
                  {milestone.title}: {milestone.status} (${milestone.amount})
                </li>
              ))}
            </ul>
          </>
        )}
      </Card>
    </div>
  );
}
