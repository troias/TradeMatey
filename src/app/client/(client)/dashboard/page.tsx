"use client";

import { useState, useEffect, useRef } from "react"; // Add useRef
import { Card, Button } from "@/components/ui";
import { supabase } from "@/lib/supabase/client";
import { toast } from "react-hot-toast";
import Chart from "chart.js/auto";

export default function Dashboard() {
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const chartRef = useRef<HTMLCanvasElement>(null);
  const chartInstanceRef = useRef<Chart | null>(null);
  const [commissions, setCommissions] = useState([]);
  useEffect(() => {
    const fetchCommissions = async () => {
      const res = await fetch("/api/commissions");
      if (res.ok) setCommissions(await res.json());
      else toast.error("Failed to fetch commissions");
    };
    fetchCommissions();
  }, []);

  const fetchJobs = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const { data, error } = await supabase
      .from("jobs")
      .select("*, milestones(*), region")
      .eq("client_id", user!.id);
    if (error) throw error;
    setJobs(data || []);
  };

  useEffect(() => {
    const channel = supabase
      .channel("bookings")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "bookings" },
        () => fetchJobs()
      )
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, []);

  useEffect(() => {
    const channel = supabase
      .channel("milestones")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "milestones" },
        () => fetchJobs()
      )
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, []);

  useEffect(() => {
    fetchJobs()
      .catch((e) => toast.error(e.message))
      .finally(() => setLoading(false));
  }, []);

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
            {jobs.map((job) => (
              <Card key={job.id} className="p-4">
                <h2 className="text-xl">{job.title}</h2>
                <p>Status: {job.status}</p>
                <h3 className="text-lg mt-2">Milestones:</h3>
                <ul>
                  {job.milestones.map((milestone: any) => (
                    <li key={milestone.id} className="mt-1">
                      {milestone.title}: {milestone.status} (Amount: A$
                      {milestone.amount.toFixed(2)}, Commission: A$
                      {(milestone.commission || 0).toFixed(2)})
                      {milestone.status === "completed" && (
                        <>
                          <Button onClick={() => verifyMilestone(milestone.id)}>
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
                  ))}
                </ul>
              </Card>
            ))}

            <Card className="p-4 mt-4">
              <h2 className="text-xl font-bold">Commissions</h2>
              <ul>
                {commissions.map((c) => (
                  <li key={c.id}>
                    A${c.amount.toFixed(2)} ({c.source_type} {c.source_id}) -{" "}
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
