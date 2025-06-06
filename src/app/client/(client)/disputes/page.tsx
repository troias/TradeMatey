"use client";

import { useState, useEffect } from "react";
import { Card, Button } from "@/components/ui";
import { useAuth } from "@/context/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { toast } from "react-hot-toast";

export default function Disputes() {
  const { user } = useAuth();
  const [disputes, setDisputes] = useState<any[]>([]);

  const { data, error, isLoading } = useQuery({
    queryKey: ["disputes", user?.id],
    queryFn: async () => {
      const res = await fetch(`/api/disputes?user_id=${user?.id}`);
      if (!res.ok) throw new Error("Failed to fetch disputes");
      return res.json();
    },
  });

  useEffect(() => {
    if (data) setDisputes(data);
    if (error) toast.error(error.message);
  }, [data, error]);

  if (isLoading) return <div className="text-center py-10">Loading...</div>;

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
        Disputes
      </h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {disputes.map((dispute) => (
          <Card key={dispute.id} className="p-6 shadow-lg">
            <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200">
              {dispute.title}
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              Job: {dispute.jobs.title}
            </p>
            <p className="text-gray-600 dark:text-gray-400">
              Tradie: {dispute.users.name}
            </p>
            <p className="text-gray-600 dark:text-gray-400">
              Status:{" "}
              {dispute.qbcc_dispute ? "Escalated to QBCC" : "In Dispute"}
            </p>
            {!dispute.qbcc_dispute &&
              new Date() > new Date(dispute.funds_acquired_date) && (
                <Button
                  onClick={async () => {
                    const res = await fetch("/api/disputes", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        milestone_id: dispute.id,
                        action: "escalate",
                      }),
                    });
                    if (res.ok) toast.success("Escalated to QBCC!");
                    else toast.error("Escalation failed");
                  }}
                  variant="destructive"
                  className="mt-4 w-full"
                >
                  Escalate to QBCC
                </Button>
              )}
          </Card>
        ))}
      </div>
    </div>
  );
}
