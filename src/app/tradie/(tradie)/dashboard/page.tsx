"use client";

import { useState, useEffect } from "react";
import { Card, Button } from "@/components/ui";
import { supabase } from "@/lib/supabase/client";
import { toast } from "react-hot-toast";
import { useRouter } from "next/navigation";

export default function TradieDashboard() {
  const [jobs, setJobs] = useState<any[]>([]);
  const [isTopTradie, setIsTopTradie] = useState(false);
  const router = useRouter();

  const fetchJobs = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const { data, error } = await supabase
      .from("jobs")
      .select("*, milestones(*), region")
      .eq("tradie_id", user!.id);
    if (error) throw error;
    setJobs(data || []);
  };

  useEffect(() => {
    const fetchUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const { data } = await supabase
        .from("users")
        .select("top_tradie")
        .eq("id", user!.id)
        .single();
      setIsTopTradie(data?.top_tradie || false);
    };
    fetchUser();
  }, []);

  useEffect(() => {
    const channel = supabase
      .channel("milestones")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "milestones" },
        (payload) => {
          if (
            payload.new.status === "verified" ||
            payload.new.status === "paid"
          ) {
            toast.success(
              `Milestone "${payload.new.title}" ${payload.new.status}!`
            );
            fetchJobs();
          }
        }
      )
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, []);

  useEffect(() => {
    fetchJobs().catch((e) => toast.error(e.message));
  }, []);

  const markCompleted = async (milestoneId: string) => {
    const { data, error } = await supabase
      .from("milestones")
      .update({ status: "completed" })
      .eq("id", milestoneId)
      .select();
    if (error) {
      toast.error("Failed to mark as completed");
    } else {
      toast.success("Milestone marked as completed!");
      fetchJobs();
    }
  };

  const viewDetails = (jobId: string) => router.push(`/tradie/job/${jobId}`);

  const disputeMilestone = async (milestoneId: string) => {
    const res = await fetch("/api/disputes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ milestone_id: milestoneId }),
    });
    if (res.ok) toast.success("Dispute initiated!");
    else toast.error("Failed to initiate dispute");
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold">Tradie Dashboard</h1>
      <p className="text-sm">
        Milestones follow QBCC-compliant 14+14 day payment timelines.
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
        {jobs.map((job) => (
          <Card key={job.id} className="p-4">
            <h2 className="text-xl">{job.title}</h2>
            <p>Status: {job.status}</p>
            <h3 className="text-lg mt-2">Milestones:</h3>
            <ul>
              {job.milestones.map((milestone: any) => {
                const commissionRate = isTopTradie ? 0.0167 : 0.0333;
                const commission =
                  job.region === "Regional"
                    ? Math.min(milestone.amount * commissionRate, 25)
                    : milestone.amount * commissionRate;
                return (
                  <li key={milestone.id} className="mt-1">
                    {milestone.title}: {milestone.status} (Amount: A$
                    {milestone.amount.toFixed(2)}, Commission: A$
                    {commission.toFixed(2)})
                    {milestone.status === "pending" && (
                      <Button onClick={() => markCompleted(milestone.id)}>
                        Mark as Completed
                      </Button>
                    )}
                    {milestone.status === "completed" && (
                      <Button
                        variant="outline"
                        onClick={() => disputeMilestone(milestone.id)}
                      >
                        Dispute
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      onClick={() => viewDetails(job.id)}
                    >
                      View Details
                    </Button>
                  </li>
                );
              })}
            </ul>
          </Card>
        ))}
      </div>
    </div>
  );
}
