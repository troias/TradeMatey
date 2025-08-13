"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, Button } from "@/components/ui";
import { useAuth } from "@/components/Providers";
import { toast } from "react-hot-toast";

interface Job {
  id: string;
  title?: string;
  description?: string;
  created_at?: string;
  status?: string;
  region?: string;
}

export default function BrowseJobs() {
  const supabase = createClient();
  const { user, role } = useAuth();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || role !== "tradie") return;
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("jobs")
        .select("id, title, description, created_at, status, region")
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) toast.error(error.message);
      setJobs(data || []);
      setLoading(false);
    })();
  }, [user, role, supabase]);

  const expressInterest = async (jobId: string) => {
    try {
      const { error } = await supabase
        .from("job_interest")
        .insert({ job_id: jobId, tradie_id: user?.id });
      if (error) throw error;
      toast.success("Interest expressed!");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    }
  };

  if (!user) return <div className="p-6">Please log in.</div>;
  if (role !== "tradie")
    return <div className="p-6">Only tradies can browse jobs.</div>;

  return (
    <div className="container mx-auto p-6 space-y-6">
      <h1 className="text-3xl font-bold">Available Client Jobs</h1>
      {loading && <div>Loading jobs...</div>}
      {!loading && jobs.length === 0 && <div>No jobs found.</div>}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {jobs.map((job) => (
          <Card key={job.id} className="p-5 flex flex-col justify-between">
            <div>
              <h2 className="text-xl font-semibold mb-1">
                {job.title || "Untitled"}
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-3 mb-2">
                {job.description || "No description."}
              </p>
              <p className="text-xs text-gray-500 mb-1">
                Region: {job.region || "-"}
              </p>
              <p className="text-xs text-gray-500 mb-1">
                Status: {job.status || "-"}
              </p>
              <p className="text-xs text-gray-500">
                Posted:{" "}
                {job.created_at
                  ? new Date(job.created_at).toLocaleDateString()
                  : "-"}
              </p>
            </div>
            <Button onClick={() => expressInterest(job.id)} className="mt-4">
              Express Interest
            </Button>
          </Card>
        ))}
      </div>
    </div>
  );
}
