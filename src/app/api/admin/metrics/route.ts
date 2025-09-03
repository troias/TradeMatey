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

  let isAdmin = (roles || []).some((r: { role: string }) => r.role === "admin");
  if (!isAdmin) {
    // Fallback to legacy users.roles array
    try {
      const { data: userRow } = await supabase
        .from("users")
        .select("roles")
        .eq("id", user.id)
        .maybeSingle();
      const legacyRoles: string[] = (userRow?.roles as string[]) || [];
      isAdmin = legacyRoles.includes("admin");
  } catch {
      // ignore and treat as non-admin
  }
  }
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
  let totalFees = 0;
  try {
    const { data: feeAgg, error: feeErr } = await supabase
      .from("payments")
      .select("commission_fee");
    if (!feeErr && feeAgg) {
      type FeeRow = { commission_fee: number | null };
      totalFees = (feeAgg as FeeRow[]).reduce(
        (s: number, p: FeeRow) => s + (p.commission_fee || 0),
        0
      );
    }
  } catch {
    totalFees = 0;
  }

  // GMV: sum of payments.amount (gross before fee) if tracked; else derive from jobs/milestones if available
  // GMV: attempt to read payments.amount if available, otherwise fall back to totalFees
  let totalGMV = 0;
  try {
    const { data: payAgg, error: payErr } = await supabase
      .from("payments")
      .select("amount");
    if (!payErr && payAgg) {
      type PayRow = { amount: number | null };
      totalGMV = (payAgg as PayRow[]).reduce(
        (s: number, p: PayRow) => s + (p.amount || 0),
        0
      );
    } else {
      totalGMV = totalFees;
    }
  } catch {
    totalGMV = totalFees;
  }

  // Active users in last 30 days (by any payment or job created)
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  let activeUsers30d = 0;
  try {
    const { data: actPay, error: actErr } = await supabase
      .from("payments")
      .select("client_id, tradie_id, created_at")
      .gte("created_at", since);
    if (!actErr && actPay) {
      type ActRow = { client_id: string | null; tradie_id: string | null };
      const activeUserSet = new Set<string>();
      (actPay as ActRow[]).forEach((p) => {
        if (p.client_id) activeUserSet.add(p.client_id);
        if (p.tradie_id) activeUserSet.add(p.tradie_id);
      });
      activeUsers30d = activeUserSet.size;
    } else {
      // Fallback: try counting recent jobs
      const { data: recentJobs, error: jobsErr } = await supabase
        .from("jobs")
        .select("client_id, tradie_id, created_at")
        .gte("created_at", since);
      if (!jobsErr && recentJobs) {
        const activeUserSet = new Set<string>();
        (recentJobs as { client_id?: string | null; tradie_id?: string | null }[]).forEach((j) => {
          if (j.client_id) activeUserSet.add(j.client_id);
          if (j.tradie_id) activeUserSet.add(j.tradie_id);
        });
        activeUsers30d = activeUserSet.size;
  } else {
        activeUsers30d = 0;
      }
    }
  } catch {
    activeUsers30d = 0;
  }

  // Jobs status counts
  let jobsByStatus: Record<string, number> = {};
  try {
    const { data: jobs, error: jobsErr } = await supabase
      .from("jobs")
      .select("status");
    if (!jobsErr && jobs) {
      type JobRow = { status: string | null };
      jobsByStatus = (jobs as JobRow[]).reduce(
        (acc: Record<string, number>, j: JobRow) => {
          const key = j.status || "unknown";
          acc[key] = (acc[key] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>
      );
    }
  } catch {
    jobsByStatus = {};
  }

  // ARPU (fees per active user in 30d)
  const arpu = activeUsers30d ? totalFees / activeUsers30d : 0;

  // Top 5 service types by GMV (if payments link to job -> client service type)
  // Best effort: join-like pass if schema holds job_id and clients table service_type_id
  let topServiceTypes: Array<{ name: string; gmv: number }> = [];
  try {
    const { data: svcAgg, error: svcErr } = await supabase
      .from("payments")
      .select(
        "amount, jobs:job_id(id, clients:user_id(service_type_id), service_types:service_type_id(name))"
      );
    if (svcErr || !svcAgg) throw svcErr || new Error("no data");
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
