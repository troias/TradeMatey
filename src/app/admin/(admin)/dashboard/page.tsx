"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui";
import { toast } from "react-hot-toast";
import { useSearchParams } from "next/navigation";

type Metrics = {
  totalFees: number;
  totalGMV: number;
  activeUsers30d: number;
  jobsByStatus: Record<string, number>;
  arpu: number;
  topServiceTypes: Array<{ name: string; gmv: number }>;
};

export default function AdminDashboard() {
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [loading, setLoading] = useState(true);
  const search = useSearchParams();

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        // Optional signed token check
        const token = search.get("token");
        if (token) {
          await fetch("/api/admin/metrics", {
            headers: { "x-admin-token": token },
          }).catch(() => {});
        }
        const res = await fetch("/api/admin/metrics");
        if (!res.ok) throw new Error(`Failed: ${res.status}`);
        const data: Metrics = await res.json();
        if (mounted) setMetrics(data);
      } catch (err) {
        const msg =
          err instanceof Error ? err.message : "Failed to load metrics";
        toast.error(msg);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [search]);

  if (loading) return <div className="text-center py-10">Loading...</div>;
  if (!metrics) return <div className="text-center py-10">No data</div>;

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
        Admin Dashboard
      </h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="p-6">
          <h2 className="text-xl font-semibold">
            Total Earnings (Platform Fees)
          </h2>
          <p className="text-3xl font-bold mt-2">
            A${metrics.totalFees.toFixed(2)}
          </p>
        </Card>
        <Card className="p-6">
          <h2 className="text-xl font-semibold">Gross Merchandise Volume</h2>
          <p className="text-3xl font-bold mt-2">
            A${metrics.totalGMV.toFixed(2)}
          </p>
        </Card>
        <Card className="p-6">
          <h2 className="text-xl font-semibold">Active Users (30d)</h2>
          <p className="text-3xl font-bold mt-2">{metrics.activeUsers30d}</p>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-2">Jobs by Status</h2>
          <ul className="space-y-1">
            {Object.entries(metrics.jobsByStatus).map(([status, count]) => (
              <li key={status} className="flex justify-between">
                <span className="capitalize">{status.replace(/_/g, " ")}</span>
                <span>{count}</span>
              </li>
            ))}
          </ul>
        </Card>
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-2">
            Top Service Types by GMV
          </h2>
          <ul className="space-y-1">
            {metrics.topServiceTypes.map((row) => (
              <li key={row.name} className="flex justify-between">
                <span>{row.name}</span>
                <span>A${row.gmv.toFixed(2)}</span>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <Card className="p-6">
        <h2 className="text-xl font-semibold">ARPU (30d)</h2>
        <p className="text-3xl font-bold mt-2">A${metrics.arpu.toFixed(2)}</p>
      </Card>
    </div>
  );
}
