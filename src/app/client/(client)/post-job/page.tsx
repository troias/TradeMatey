"use client";

import { useState, useEffect } from "react"; // Add useEffect
import { Button } from "@/components/ui";
import { useRouter } from "next/navigation";
import { toast } from "react-hot-toast";
import { supabase } from "@/lib/supabase/client";

export default function PostJob() {
  const [job, setJob] = useState({ title: "", description: "", budget: "" });
  const [milestones, setMilestones] = useState([
    { title: "", description: "", percentage: "", due_date: "" },
  ]);
  const [region, setRegion] = useState("");
  const router = useRouter();

  useEffect(() => {
    const fetchUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const { data } = await supabase
        .from("users")
        .select("region")
        .eq("id", user!.id)
        .single();
      setRegion(data?.region || "");
    };
    fetchUser();
  }, []);

  const calculateCommission = () => {
    const budget = Number(job.budget);
    let commission = budget * 0.0333;
    if (region === "Regional") commission = Math.min(commission, 25);
    return commission.toFixed(2);
  };

  const addMilestone = () => {
    setMilestones([
      ...milestones,
      { title: "", description: "", percentage: "", due_date: "" },
    ]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const totalPercentage = milestones.reduce(
      (sum, m) => sum + Number(m.percentage),
      0
    );
    if (totalPercentage !== 100) {
      toast.error("Milestone percentages must sum to 100%");
      return;
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();
    const res = await fetch("/api/jobs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: job.title,
        description: job.description,
        budget: Number(job.budget),
        client_id: user!.id,
        payment_type: "milestone",
        milestones,
      }),
    });

    if (res.ok) {
      toast.success("Job posted!");
      router.push("/client/dashboard");
    } else {
      toast.error("Failed to post job");
    }
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold">Post a Job</h1>
      <form onSubmit={handleSubmit} className="space-y-4 mt-4">
        <div>
          <label className="block">Job Title</label>
          <input
            type="text"
            value={job.title}
            onChange={(e) => setJob({ ...job, title: e.target.value })}
            className="w-full p-2 border rounded"
            required
          />
        </div>
        <div>
          <label className="block">Description</label>
          <textarea
            value={job.description}
            onChange={(e) => setJob({ ...job, description: e.target.value })}
            className="w-full p-2 border rounded"
            required
          />
        </div>
        <div>
          <label className="block">Budget (A$)</label>
          <input
            type="number"
            value={job.budget}
            onChange={(e) => setJob({ ...job, budget: e.target.value })}
            className="w-full p-2 border rounded"
            required
          />
        </div>
        <h2 className="text-xl font-semibold">Milestones</h2>
        {milestones.map((milestone, index) => (
          <div key={index} className="space-y-2 border p-4 rounded">
            <div>
              <label className="block">Milestone Title</label>
              <input
                type="text"
                value={milestone.title}
                onChange={(e) => {
                  const newMilestones = [...milestones];
                  newMilestones[index].title = e.target.value;
                  setMilestones(newMilestones);
                }}
                className="w-full p-2 border rounded"
                required
              />
            </div>
            <div>
              <label className="block">Description</label>
              <textarea
                value={milestone.description}
                onChange={(e) => {
                  const newMilestones = [...milestones];
                  newMilestones[index].description = e.target.value;
                  setMilestones(newMilestones);
                }}
                className="w-full p-2 border rounded"
              />
            </div>
            <div>
              <label className="block">Percentage (%)</label>
              <input
                type="number"
                value={milestone.percentage}
                onChange={(e) => {
                  const newMilestones = [...milestones];
                  newMilestones[index].percentage = e.target.value;
                  setMilestones(newMilestones);
                }}
                className="w-full p-2 border rounded"
                required
              />
            </div>
            <div>
              <label className="block">Due Date</label>
              <input
                type="date"
                value={milestone.due_date}
                onChange={(e) => {
                  const newMilestones = [...milestones];
                  newMilestones[index].due_date = e.target.value;
                  setMilestones(newMilestones);
                }}
                className="w-full p-2 border rounded"
                required
              />
            </div>
          </div>
        ))}
        <p className="text-sm">
          Estimated commission: A${calculateCommission()} (
          {region === "Regional" ? "capped at A$25" : "3.33%"})
        </p>
        <Button type="button" onClick={addMilestone} variant="outline">
          Add Milestone
        </Button>
        <Button type="submit">Post Job</Button>
      </form>
    </div>
  );
}
