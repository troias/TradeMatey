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
        // background sync with CRM for current user
        fetch("/api/admin/sync", { method: "POST" }).catch(() => {});
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
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-4xl font-extrabold tracking-tight text-gray-900 dark:text-gray-100">
          Admin Dashboard
        </h1>
        <div className="text-sm text-gray-500">Last updated: --</div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="flex flex-col justify-between">
          <div className="text-sm font-medium text-gray-500">
            Total Earnings
          </div>
          <div className="mt-4 flex items-baseline gap-3">
            <span className="text-2xl text-gray-500">A$</span>
            <span className="text-4xl font-extrabold">
              {metrics.totalFees.toFixed(2)}
            </span>
          </div>
          <div className="text-xs text-gray-400 mt-3">Platform fees (30d)</div>
        </Card>

        <Card className="flex flex-col justify-between">
          <div className="text-sm font-medium text-gray-500">
            Gross Merchandise Volume
          </div>
          <div className="mt-4">
            <span className="text-3xl font-extrabold">
              A${metrics.totalGMV.toFixed(2)}
            </span>
          </div>
          <div className="text-xs text-gray-400 mt-3">Total GMV (30d)</div>
        </Card>

        <Card className="flex flex-col justify-between">
          <div className="text-sm font-medium text-gray-500">
            Active Users (30d)
          </div>
          <div className="mt-4">
            <span className="text-3xl font-extrabold">
              {metrics.activeUsers30d}
            </span>
          </div>
          <div className="text-xs text-gray-400 mt-3">Unique active users</div>
        </Card>

        <Card className="flex flex-col justify-between">
          <div className="text-sm font-medium text-gray-500">ARPU</div>
          <div className="mt-4">
            <span className="text-3xl font-extrabold">
              A${metrics.arpu.toFixed(2)}
            </span>
          </div>
          <div className="text-xs text-gray-400 mt-3">
            Average revenue per user (30d)
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <h3 className="text-lg font-semibold mb-4">Jobs by Status</h3>
          <div className="space-y-3">
            {Object.entries(metrics.jobsByStatus).map(([status, count]) => (
              <div key={status} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-indigo-500/80" />
                  <span className="capitalize text-sm text-gray-700">
                    {status.replace(/_/g, " ")}
                  </span>
                </div>
                <div className="text-sm font-medium text-gray-900">{count}</div>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <h3 className="text-lg font-semibold mb-4">
            Top Service Types by GMV
          </h3>
          <ul className="space-y-3">
            {metrics.topServiceTypes.map((row) => (
              <li key={row.name} className="flex justify-between items-center">
                <div>
                  <div className="text-sm font-medium text-gray-800">
                    {row.name}
                  </div>
                  <div className="text-xs text-gray-500">
                    {((row.gmv / Math.max(metrics.totalGMV, 1)) * 100).toFixed(
                      1
                    )}
                    % of GMV
                  </div>
                </div>
                <div className="text-sm font-semibold">
                  A${row.gmv.toFixed(2)}
                </div>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6">
        <Card>
          <h3 className="text-lg font-semibold mb-2">Notes</h3>
          <p className="text-sm text-gray-600">
            This dashboard surfaces high-level platform metrics. For deeper
            analysis export data to your BI tools.
          </p>
        </Card>
      </div>
    </div>
  );
}
