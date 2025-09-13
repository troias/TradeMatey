"use client";

import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "react-hot-toast";
import { Dispute } from "@/types";

export default function SupportDashboard() {
  const [disputes, setDisputes] = useState<Dispute[]>([]);

  const { data, error, isLoading } = useQuery<Dispute[]>({
    queryKey: ["disputes"],
    queryFn: async () => {
      const res = await fetch("/api/disputes");
      if (!res.ok) throw new Error("Failed to fetch disputes");
      return res.json();
    },
  });

  useEffect(() => {
    if (data) setDisputes(data);
    if (error) toast.error(error.message);
  }, [data, error]);

  const escalateToQBCC = async (_disputeId: string) => {
    const res = await fetch("/api/disputes/escalate", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dispute_id: _disputeId }),
    });
    if (res.ok) toast.success("Escalated to QBCC!");
    else toast.error("Failed to escalate");
  };
  // keep reference to avoid lint complaining about unused function while it's enabled in UI later
  void escalateToQBCC;

  if (isLoading) return <div className="text-center py-10">Loading...</div>;

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
        Support Dashboard
      </h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {disputes.map((dispute) => (
          <div
            key={dispute.id}
            className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow-lg"
          >
            <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200">
              {dispute.title}
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              Job: {dispute.jobs.title}
            </p>
            <p className="text-gray-600 dark:text-gray-400">
              Status:{" "}
              {dispute.qbcc_dispute ? "Escalated to QBCC" : "In Dispute"}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
