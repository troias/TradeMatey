import { NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";

// Admin metrics: platform fees (earnings), GMV, active users, jobs status counts, ARPU, etc.
export async function GET(request: Request) {
  const supabase = createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Check admin role
  const { data: roles } = await supabase
    .from("user_roles_if_migrated")
    .select("role")
    .eq("user_id", user.id);
  const isAdmin = (roles || []).some(
    (r: { role: string }) => r.role === "admin"
  );
  if (!isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Optional: validate a short-lived admin token if present
  const token = request.headers.get("x-admin-token");
  if (token) {
    const { data: link } = await supabase
      .from("admin_links")
      .select("id, user_id, expires_at, used")
      .eq("user_id", user.id)
      .eq("token", token)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    const expired = link?.expires_at && new Date(link.expires_at) < new Date();
    if (!link || link.used || expired) {
      return NextResponse.json(
        { error: "Invalid admin token" },
        { status: 401 }
      );
    }
    await supabase.from("admin_links").update({ used: true }).eq("id", link.id);
  }

  // Platform fees (earnings): sum of payments.commission_fee
  const { data: feeAgg } = await supabase
    .from("payments")
    .select("commission_fee")
    .neq("commission_fee", null);
  type FeeRow = { commission_fee: number | null };
  const totalFees = (feeAgg || []).reduce(
    (s: number, p: FeeRow) => s + (p.commission_fee || 0),
    0
  );

  // GMV: sum of payments.amount (gross before fee) if tracked; else derive from jobs/milestones if available
  const { data: payAgg } = await supabase.from("payments").select("amount");
  type PayRow = { amount: number | null };
  const totalGMV = (payAgg || []).reduce(
    (s: number, p: PayRow) => s + (p.amount || 0),
    0
  );

  // Active users in last 30 days (by any payment or job created)
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const { data: actPay } = await supabase
    .from("payments")
    .select("client_id, tradie_id, created_at")
    .gte("created_at", since);
  type ActRow = { client_id: string | null; tradie_id: string | null };
  const activeUserSet = new Set<string>();
  (actPay || []).forEach((p: ActRow) => {
    if (p.client_id) activeUserSet.add(p.client_id);
    if (p.tradie_id) activeUserSet.add(p.tradie_id);
  });
  const activeUsers30d = activeUserSet.size;

  // Jobs status counts
  const { data: jobs } = await supabase.from("jobs").select("status");
  type JobRow = { status: string | null };
  const jobsByStatus = (jobs || []).reduce(
    (acc: Record<string, number>, j: JobRow) => {
      const key = j.status || "unknown";
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  // ARPU (fees per active user in 30d)
  const arpu = activeUsers30d ? totalFees / activeUsers30d : 0;

  // Top 5 service types by GMV (if payments link to job -> client service type)
  // Best effort: join-like pass if schema holds job_id and clients table service_type_id
  let topServiceTypes: Array<{ name: string; gmv: number }> = [];
  try {
    const { data: svcAgg } = await supabase
      .from("payments")
      .select(
        "amount, jobs:job_id(id, clients:user_id(service_type_id), service_types:service_type_id(name))"
      );
    // Supabase nested select can return arrays for joins; keep type broad but typed
    type JobSvc = { service_types?: { name?: string | null } | null };
    type SvcRow = { amount: number | null; jobs?: JobSvc | JobSvc[] | null };
    const map = new Map<string, number>();
    ((svcAgg as unknown as SvcRow[] | null) || []).forEach((row) => {
      // Support both array and object shapes
      const jobs = row.jobs;
      const svcName = Array.isArray(jobs)
        ? jobs[0]?.service_types?.name
        : jobs?.service_types?.name;
      const name = svcName || "Unknown";
      map.set(name, (map.get(name) || 0) + (row.amount || 0));
    });
    topServiceTypes = Array.from(map.entries())
      .map(([name, gmv]) => ({ name, gmv }))
      .sort((a, b) => b.gmv - a.gmv)
      .slice(0, 5);
  } catch {}

  return NextResponse.json({
    totalFees,
    totalGMV,
    activeUsers30d,
    jobsByStatus,
    arpu,
    topServiceTypes,
  });
}
