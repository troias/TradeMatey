"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { Card, Button } from "@/components/ui";
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
            <ul className="mt-2 space-y-2">
              {job.milestones.map((milestone: any) => (
                <li
                  key={milestone.id}
                  className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
                >
                  {milestone.title}: {milestone.status} (${milestone.amount})
                  {milestone.status === "pending" && (
                    <Button
                      onClick={() =>
                        alert("Mark complete functionality coming soon!")
                      }
                      className="mt-2"
                    >
                      Mark Complete
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          </>
        )}
      </Card>
    </div>
  );
}
