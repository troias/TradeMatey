"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Card, Button } from "@/components/ui";
import { createClient } from "@/lib/supabase/client";
import { toast } from "react-hot-toast";
import Chart from "chart.js/auto";
import MilestoneBadge from "@/components/MilestoneBadge";

type Milestone = {
  id: string;
  title: string;
  status: string;
  amount: number;
  commission?: number;
};

type Job = {
  id: string;
  title: string;
  status: string;
  milestones: Milestone[];
  region?: string;
};

export default function Dashboard() {
  const supabase = createClient();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const chartRef = useRef<HTMLCanvasElement | null>(null);
  const chartInstanceRef = useRef<Chart | null>(null);
  type Fee = {
    id: string;
    amount: number;
    source_id: string | null;
    created_at: string;
  };
  const [commissions, setCommissions] = useState<Fee[]>([]);
  const [outstanding, setOutstanding] = useState<Milestone[]>([]);
  const [debugOpen, setDebugOpen] = useState(false);
  const [debugUserId, setDebugUserId] = useState<string | null>(null);
  const [debugData, setDebugData] = useState<unknown | null>(null);
  const [debugError, setDebugError] = useState<unknown | null>(null);

  const router = useRouter();
  const viewDetails = (jobId: string) => router.push(`/client/job/${jobId}`);

  useEffect(() => {
    const fetchCommissions = async () => {
      try {
        const res = await fetch("/api/fees");
        if (res.ok) setCommissions(await res.json());
        else toast.error("Failed to fetch commissions");
      } catch (e) {
        console.warn("fetchCommissions failed", e);
      }
    };
    fetchCommissions();
    const fetchOutstanding = async () => {
      try {
        const { data: userData } = await supabase.auth.getUser();
        if (!userData?.user) return;
        const { data } = await supabase
          .from("milestones")
          .select("id, title, amount, status, job_id")
          .eq("status", "pending")
          .eq("client_id", userData.user.id);
        setOutstanding((data as Milestone[]) || []);
      } catch (e) {
        console.warn("fetchOutstanding failed", e);
      }
    };
    fetchOutstanding();
  }, []);

  const fetchJobs = useCallback(async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        console.warn("fetchJobs: no authenticated user found");
        setDebugUserId(null);
        setDebugData(null);
        setDebugError({ reason: "no authenticated user" });
        setJobs([]);
        return;
      }

      console.debug("fetchJobs: authenticated user id=", user.id);
      setDebugUserId(user.id);

      const { data, error } = await supabase
        .from("jobs")
        .select("*, milestones(*)")
        .eq("client_id", user.id);

      if (error) {
        // Supabase sometimes returns an empty error object; logging that
        // directly in Next dev can trigger the overlay. Stringify when
        // possible, and avoid console.error with a naked object.
        const hasKeys =
          typeof error === "object" &&
          error !== null &&
          Object.keys(error).length > 0;
        try {
          console.warn(
            "fetchJobs: supabase error:",
            hasKeys ? JSON.stringify(error) : error
          );
        } catch {
          console.warn(
            "fetchJobs: supabase error (non-serializable)",
            error as unknown
          );
        }

        // Safely extract message/code without using `any`
        const se = error as unknown as Record<string, unknown> | null;
        const msg =
          se && typeof se["message"] === "string"
            ? (se["message"] as string)
            : se && typeof se["code"] === "string"
            ? (se["code"] as string)
            : hasKeys
            ? "unknown"
            : "no_error_info";

        toast.error("Failed to fetch jobs: " + msg);
        setDebugData(data ?? null);
        setDebugError(error);
        setJobs([]);
        return;
      }

      console.debug(
        "fetchJobs: rows returned",
        Array.isArray(data) ? data.length : 0,
        data
      );
      setDebugData(data ?? null);
      setDebugError(null);
      setJobs((data as unknown as Job[]) || []);
    } catch (err) {
      console.warn("fetchJobs: unexpected error", err);
      toast.error("Unexpected error while fetching jobs");
      setJobs([]);
    }
  }, [supabase]);

  useEffect(() => {
    fetchJobs()
      .catch((e: unknown) => {
        let msg = String(e ?? "fetchJobs error");
        if (typeof e === "object" && e !== null) {
          const rec = e as Record<string, unknown>;
          if (typeof rec["message"] === "string")
            msg = rec["message"] as string;
        }
        toast.error(msg);
      })
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const stats = useMemo(() => {
    const total = jobs.length;
    const completed = jobs.filter((job) => job.status === "completed").length;
    const inProgress = jobs.filter(
      (job) => job.status === "in_progress"
    ).length;
    const pending = jobs.filter((job) => job.status === "pending").length;
    return { total, completed, inProgress, pending };
  }, [jobs]);

  useEffect(() => {
    if (chartRef.current && jobs.length) {
      const completed = jobs.filter((job) => job.status === "completed").length;
      const inProgress = jobs.filter(
        (job) => job.status === "in_progress"
      ).length;
      const pending = jobs.filter((job) => job.status === "pending").length;

      if (chartInstanceRef.current) {
        chartInstanceRef.current.destroy();
      }

      chartInstanceRef.current = new Chart(chartRef.current, {
        type: "bar",
        data: {
          labels: ["Completed", "In Progress", "Pending"],
          datasets: [
            {
              label: "Job Status",
              data: [completed, inProgress, pending],
              backgroundColor: ["#2563EB", "#FBBF24", "#EF4444"],
              borderColor: ["#1E40AF", "#D97706", "#B91C1C"],
              borderWidth: 1,
            },
          ],
        },
        options: {
          scales: {
            y: {
              beginAtZero: true,
              title: { display: true, text: "Number of Jobs" },
            },
            x: { title: { display: true, text: "Status" } },
          },
          plugins: {
            legend: { display: true, position: "top" },
            title: { display: true, text: "Job Completion Rate" },
          },
        },
      });
    }
    return () => {
      if (chartInstanceRef.current) {
        chartInstanceRef.current.destroy();
      }
    };
  }, [jobs]);

  const verifyMilestone = async (milestoneId: string) => {
    const res = await fetch("/api/payments", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ milestone_id: milestoneId, action: "verify" }),
    });
    if (res.ok) {
      toast.success("Milestone verified!");
      fetchJobs();
    } else {
      toast.error("Failed to verify milestone");
    }
  };

  const disputeMilestone = async (milestoneId: string) => {
    const res = await fetch("/api/disputes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ milestone_id: milestoneId }),
    });
    if (res.ok) {
      toast.success("Dispute initiated!");
      fetchJobs();
    } else {
      toast.error("Failed to initiate dispute");
    }
  };

  const payMilestone = async (milestoneId: string) => {
    const { data: milestone } = await supabase
      .from("milestones")
      .select("amount")
      .eq("id", milestoneId)
      .single();
    const res = await fetch("/api/payments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        milestone_id: milestoneId,
        amount: milestone!.amount,
      }),
    });
    if (res.ok) {
      toast.success("Payment processed!");
      fetchJobs();
    } else {
      toast.error("Payment failed");
    }
  };

  return (
    <div className="container mx-auto p-4">
      {loading ? (
        <p>Loading...</p>
      ) : (
        <>
          <h1 className="text-2xl font-bold">Client Dashboard</h1>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <Card className="p-4">
              <h2 className="text-xl font-bold">Your jobs</h2>
              <p className="text-3xl font-extrabold mt-2">{stats.total}</p>
              <div className="text-sm text-gray-600 mt-2">
                <div>Completed: {stats.completed}</div>
                <div>In progress: {stats.inProgress}</div>
                <div>Pending: {stats.pending}</div>
              </div>
            </Card>
            <div className="flex flex-col gap-2">
              <Button onClick={() => setDebugOpen((s) => !s)} variant="outline">
                {debugOpen ? "Hide debug" : "Show debug"}
              </Button>
              {debugOpen && (
                <Card className="p-4">
                  <h3 className="font-semibold">Debug</h3>
                  <div className="text-xs mt-2">
                    <div>
                      <strong>auth.user_id:</strong> {debugUserId ?? "(none)"}
                    </div>
                    <div className="mt-2">
                      <strong>raw data:</strong>
                    </div>
                    <pre className="text-xs max-h-40 overflow-auto bg-gray-50 p-2 rounded">
                      {JSON.stringify(debugData, null, 2)}
                    </pre>
                    <div className="mt-2">
                      <strong>raw error:</strong>
                    </div>
                    <pre className="text-xs max-h-40 overflow-auto bg-gray-50 p-2 rounded">
                      {JSON.stringify(debugError, null, 2)}
                    </pre>
                  </div>
                </Card>
              )}
            </div>
            {jobs.map((job) => (
              <Card key={job.id} className="p-4">
                <h2 className="text-xl">{job.title}</h2>
                <p>Status: {job.status}</p>
                <h3 className="text-lg mt-2">Milestones:</h3>
                <ul>
                  {job.milestones.map(
                    (milestone: {
                      id: string;
                      title: string;
                      status: string;
                      amount: number;
                      commission?: number;
                    }) => (
                      <li key={milestone.id} className="mt-1">
                        {milestone.title}: {milestone.status} (Amount: A$
                        {milestone.amount.toFixed(2)}, Commission: A$
                        {(milestone.commission || 0).toFixed(2)})
                        {milestone.status === "completed" && (
                          <>
                            <Button
                              onClick={() => verifyMilestone(milestone.id)}
                            >
                              Verify
                            </Button>
                            <Button
                              variant="outline"
                              onClick={() => disputeMilestone(milestone.id)}
                            >
                              Dispute
                            </Button>
                          </>
                        )}
                        {milestone.status === "verified" && (
                          <Button onClick={() => payMilestone(milestone.id)}>
                            Pay A$
                            {(
                              milestone.amount + (milestone.commission || 0)
                            ).toFixed(2)}
                          </Button>
                        )}
                      </li>
                    )
                  )}
                </ul>
                <div className="mt-3">
                  <Button onClick={() => viewDetails(job.id)}>
                    View details
                  </Button>
                </div>
              </Card>
            ))}

            {/* Payments section */}
            <Card className="p-4 mt-4">
              <h2 className="text-xl font-bold">
                Outstanding milestone payments
              </h2>
              {outstanding.length === 0 ? (
                <div className="text-sm text-gray-500 mt-2">
                  No outstanding payments
                </div>
              ) : (
                <ul className="mt-2 space-y-2">
                  {outstanding.map((m) => (
                    <li
                      key={m.id}
                      className="flex justify-between items-center"
                    >
                      <div className="flex items-center gap-3">
                        <MilestoneBadge status={m.status} size="md" />
                        <div>
                          <div className="font-medium">{m.title}</div>
                          <div className="text-sm text-gray-500">
                            A${m.amount.toFixed(2)}
                          </div>
                        </div>
                      </div>
                      <div>
                        <Button onClick={() => viewDetails(m.job_id)}>
                          View job
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </Card>

            <Card className="p-4 mt-4">
              <h2 className="text-xl font-bold">Platform fees paid</h2>
              <ul>
                {commissions.map((c) => (
                  <li key={c.id}>
                    Fee A${c.amount.toFixed(2)} (job {c.source_id}) -{" "}
                    {new Date(c.created_at).toLocaleDateString()}
                  </li>
                ))}
              </ul>
            </Card>
          </div>
          <Card className="p-4 mt-4">
            <h2 className="text-xl font-bold">Job Completion Rate</h2>
            <canvas ref={chartRef} />
          </Card>
        </>
      )}
    </div>
  );
}
