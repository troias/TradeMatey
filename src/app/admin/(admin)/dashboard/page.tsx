"use client";

import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "react-hot-toast";
import { Analytics } from "@/types";

export default function AdminDashboard() {
  const [analytics, setAnalytics] = useState<Analytics | null>(null);

  const { data, error, isLoading } = useQuery<Analytics | null>({
    queryKey: ["analytics"],
    queryFn: async () => {
      const res = await fetch("/api/analytics");
      if (!res.ok) throw new Error("Failed to fetch analytics");
      return res.json();
    },
  });

  useEffect(() => {
    if (data) setAnalytics(data);
    if (error) toast.error(error.message);
  }, [data, error]);

  if (isLoading) return <div className="text-center py-10">Loading...</div>;

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
        Admin Dashboard
      </h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow-lg">
          <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200">
            Total Jobs
          </h2>
          <p className="text-3xl font-bold text-gray-900 dark:text-gray-100 mt-2">
            {analytics.totalJobs}
          </p>
        </div>
        <div className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow-lg">
          <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200">
            Completion Rate
          </h2>
          <p className="text-3xl font-bold text-gray-900 dark:text-gray-100 mt-2">
            {analytics.completionRate}%
          </p>
        </div>
        <div className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow-lg">
          <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200">
            New Users (30d)
          </h2>
          <p className="text-3xl font-bold text-gray-900 dark:text-gray-100 mt-2">
            {analytics.newUsers}
          </p>
        </div>
      </div>
    </div>
  );
}
