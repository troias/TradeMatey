"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, Button } from "@/components/ui";
import { createClient } from "@/lib/supabase/client";
import { toast } from "react-hot-toast";
import { useRouter } from "next/navigation";

export default function TradieDashboard() {
  const [jobs, setJobs] = useState<unknown[]>([]);
  const [tradieInfo, setTradieInfo] = useState<Record<string, unknown> | null>(
    null
  );
  const router = useRouter();
  const supabase = createClient();

  const fetchDashboardData = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    // Fetch tradie info
    const { data: userData, error: _userError } = await supabase
      .from("users")
      .select(
        "region, trade, bio, top_tradie, referral_credits, average_rating, completed_jobs, has_completed_onboarding"
      )
      .eq("id", user!.id)
      .single();
    setTradieInfo(userData as Record<string, unknown>);
    void _userError;
    // Fetch jobs
    const jobsResp = await supabase
      .from("jobs")
      .select("*, milestones(*), region")
      .eq("tradie_id", user!.id);
    const jobsData = (jobsResp as unknown as { data?: unknown[] }).data;
    setJobs(jobsData || []);
  }, [supabase]);

  // intentionally omit fetchDashboardData from deps to avoid re-creating channel listeners
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    fetchDashboardData().catch((e: unknown) =>
      toast.error((e as Error).message)
    );
    // ...existing code...
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
            fetchDashboardData();
          }
        }
      )
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, []);

  const markCompleted = async (milestoneId: string) => {
    const { error } = await supabase
      .from("milestones")
      .update({ status: "completed" })
      .eq("id", milestoneId)
      .select();
    if (error) {
      toast.error("Failed to mark as completed");
    } else {
      toast.success("Milestone marked as completed!");
      fetchDashboardData();
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
      {tradieInfo && (
        <Card className="mb-6 p-4">
          <h2 className="text-xl font-semibold mb-2">Your Profile</h2>
          <p>
            <strong>Region:</strong> {tradieInfo.region || "-"}
          </p>
          <p>
            <strong>Trade:</strong> {tradieInfo.trade || "-"}
          </p>
          <p>
            <strong>Bio:</strong> {tradieInfo.bio || "-"}
          </p>
          <p>
            <strong>Top Tradie:</strong> {tradieInfo.top_tradie ? "Yes" : "No"}
          </p>
          <p>
            <strong>Referral Credits:</strong>{" "}
            {tradieInfo.referral_credits ?? 0}
          </p>
          <p>
            <strong>Average Rating:</strong> {tradieInfo.average_rating ?? 0}
          </p>
          <p>
            <strong>Completed Jobs:</strong> {tradieInfo.completed_jobs ?? 0}
          </p>
          <p>
            <strong>Payout Method:</strong>{" "}
            {tradieInfo.payoutMethod || "Not Set"}
          </p>
          <p>
            <strong>Onboarding Complete:</strong>{" "}
            {tradieInfo.has_completed_onboarding ? "Yes" : "No"}
          </p>
        </Card>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
        {jobs.map((job) => {
          const jb = job as Record<string, unknown>;
          const region = jb.region as string | undefined;
          return (
            <Card key={(jb.id as string) ?? Math.random()} className="p-4">
              <h2 className="text-xl">{(jb.title as string) ?? ""}</h2>
              <p>Status: {(jb.status as string) ?? ""}</p>
              <h3 className="text-lg mt-2">Milestones:</h3>
              <ul>
                {(Array.isArray(jb.milestones) ? jb.milestones : []).map(
                  (milestone) => {
                    const ms = milestone as Record<string, unknown>;
                    const commissionRate = (tradieInfo?.top_tradie as boolean)
                      ? 0.0167
                      : 0.0333;
                    const amount = Number(ms.amount || 0);
                    const commission =
                      region === "Regional"
                        ? Math.min(amount * commissionRate, 25)
                        : amount * commissionRate;
                    return (
                      <li
                        key={(ms.id as string) ?? Math.random()}
                        className="mt-1"
                      >
                        {(ms.title as string) ?? ""}:{" "}
                        {(ms.status as string) ?? ""} (Amount: A$
                        {amount.toFixed(2)}, Commission: A$
                        {commission.toFixed(2)})
                        {ms.status === "pending" && (
                          <Button onClick={() => markCompleted(ms.id)}>
                            Mark as Completed
                          </Button>
                        )}
                        {ms.status === "completed" && (
                          <Button
                            variant="outline"
                            onClick={() => disputeMilestone(ms.id)}
                          >
                            Dispute
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          onClick={() => viewDetails(jb.id)}
                        >
                          View Details
                        </Button>
                      </li>
                    );
                  }
                )}
              </ul>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
