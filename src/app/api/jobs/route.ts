import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const { title, description, budget, milestones, region } =
      await request.json();
    const supabase = createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // Check canonical user_roles table first (newer model). Fall back to
    // legacy profiles.role to remain compatible during rollout.
    const { data: userRoles, error: userRolesError } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id);

    let isClient = false;
    if (!userRolesError && Array.isArray(userRoles) && userRoles.length > 0) {
      isClient = userRoles.some((r: { role?: string }) => r?.role === "client");
    } else {
      // Fallback to legacy profiles.role for users who haven't been migrated
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();
      if (!profileError && profile?.role === "client") isClient = true;
    }

    if (!isClient) {
      return NextResponse.json(
        { error: "Only clients can post jobs" },
        { status: 403 }
      );
    }

    // Basic input checks
    if (!title || !description || !budget || !Array.isArray(milestones)) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const numericBudget = Number(budget);
    if (!Number.isFinite(numericBudget) || numericBudget <= 0) {
      return NextResponse.json({ error: "Invalid budget" }, { status: 400 });
    }

    // Server guard: ensure milestones do not exceed 100% of budget
    // Support either 'amount' provided or fallback to 'percentage'
    type IncomingMilestone = {
      title?: string;
      description?: string;
      percentage?: number | string;
      amount?: number | string;
      due_date?: string | null;
    };
    type NormalizedMilestone = {
      title: string | undefined;
      description: string | undefined;
      amount: number;
      due_date: string | null;
    };

    const normalizedMilestones: NormalizedMilestone[] = (
      milestones as IncomingMilestone[]
    ).map((m) => {
      const pct = m.percentage != null ? Number(m.percentage) : null;
      const amt =
        m.amount != null
          ? Number(m.amount)
          : pct != null && Number.isFinite(pct)
          ? (numericBudget * pct) / 100
          : 0;
      const dueDateRaw = m.due_date;
      const due_date =
        dueDateRaw == null
          ? null
          : String(dueDateRaw).trim() === ""
          ? null
          : dueDateRaw;
      return {
        title: m.title,
        description: m.description,
        amount: Math.round(amt * 100) / 100,
        due_date,
      };
    });

    const totalAmount = normalizedMilestones.reduce(
      (sum: number, m: NormalizedMilestone) => sum + (Number(m.amount) || 0),
      0
    );
    const epsilon = 0.01; // 1 cent tolerance
    if (totalAmount - numericBudget > epsilon) {
      return NextResponse.json(
        { error: "Milestones exceed 100% of the budget" },
        { status: 400 }
      );
    }

    // Some DB schemas may not set a default/serial for jobs.id. Generate a
    // UUID here to ensure the insert includes a non-null id.
    const jobId = (globalThis.crypto && typeof globalThis.crypto.randomUUID === "function")
      ? globalThis.crypto.randomUUID()
      : (await import("crypto")).randomUUID();

    const { data: job, error: jobError } = await supabase
      .from("jobs")
      .insert({
        id: jobId,
        title,
        description,
        budget: numericBudget,
        client_id: user.id,
        status: "pending",
        payment_type: "milestone",
        region,
      })
      .select()
      .single();

    if (jobError) {
      console.error("Job insert error:", jobError);
      return NextResponse.json(
        { error: "Failed to create job", details: jobError.message || jobError },
        { status: 500 }
      );
    }

    // Ensure each milestone has a non-null id; prefer global crypto, fall back to
    // Node's crypto module.
    let nodeUuid: (() => string) | null = null;
    // Detect whether globalThis.crypto.randomUUID is available using a
    // typed local wrapper to avoid 'any' in the codebase.
    const globalWrapper = globalThis as unknown as {
      crypto?: { randomUUID?: () => string };
    };

    const hasWebCryptoUUID = typeof globalWrapper.crypto?.randomUUID === "function";

    if (!hasWebCryptoUUID) {
      const cryptoMod = await import("crypto");
      nodeUuid = () => cryptoMod.randomUUID();
    }

    let uuidGen: () => string;
    if (hasWebCryptoUUID) {
      const webCrypto = globalWrapper.crypto as { randomUUID: () => string };
      uuidGen = () => webCrypto.randomUUID();
    } else {
      uuidGen = () => nodeUuid!();
    }

    const milestoneInserts = normalizedMilestones.map((m: NormalizedMilestone) => ({
      id: uuidGen(),
      job_id: job.id,
      title: m.title,
      description: m.description,
      amount: m.amount,
      due_date: m.due_date,
      status: "pending",
    }));

    const { error: milestoneError } = await supabase
      .from("milestones")
      .insert(milestoneInserts);
    if (milestoneError) {
      console.error("Milestone insert error:", milestoneError);
      // Attempt to roll back the created job? For now, return an error with details.
      return NextResponse.json(
        { error: "Failed to create milestones", details: milestoneError.message || milestoneError },
        { status: 500 }
      );
    }

    return NextResponse.json({ job, milestones: milestoneInserts });
  } catch (error) {
    console.error("Job creation error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const jobId = url.searchParams.get("job_id");
    const supabase = createClient();

    if (!jobId) {
      return NextResponse.json({ error: "job_id is required" }, { status: 400 });
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // Ensure the requesting user owns the job (client_id) or otherwise is allowed.
    const { data: jobOwner, error: ownerError } = await supabase
      .from("jobs")
      .select("client_id")
      .eq("id", jobId)
      .single();

    if (ownerError) {
      console.warn("GET /api/jobs owner lookup error:", ownerError);
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    if (!jobOwner || jobOwner.client_id !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { data: jobRows, error: jobError } = await supabase
      .from("jobs")
      .select("*, milestones(*)")
      .eq("id", jobId);

    if (jobError) {
      console.error("GET /api/jobs error:", jobError);
      return NextResponse.json({ error: "Failed to fetch job" }, { status: 500 });
    }

    const single = (jobRows && Array.isArray(jobRows) && jobRows[0]) || null;

    // Try to fetch tradie interest/acceptance rows for this job if table exists
    let interests: unknown[] | null = null;
    try {
      const { data: interestData, error: interestError } = await supabase
        .from("job_interest")
        .select("id, job_id, tradie_id, status, created_at, updated_at, accepted_at, accepted_by")
        .eq("job_id", jobId);
      if (!interestError) interests = interestData ?? [];
    } catch (e) {
      console.debug("job_interest table missing or query failed", e);
      interests = null;
    }

    // Try to count views if job_views exists
    let viewCount: number | null = null;
    try {
      const { count, error: countErr } = await supabase
        .from("job_views")
        .select("id", { count: "exact", head: true })
        .eq("job_id", jobId);
      if (!countErr) viewCount = count ?? 0;
    } catch (e) {
      console.debug("job_views table missing or query failed", e);
      viewCount = null;
    }

    if (single) {
      // Attach metadata to the returned job row for client consumption
      type JobRowAug = typeof single & { _meta?: { interests: unknown[] | null; viewCount: number | null } };
      (single as JobRowAug)._meta = { interests, viewCount };
    }

    // Backward-compatible: return array of job rows (with _meta attached)
    return NextResponse.json(jobRows ?? []);
  } catch (err) {
    console.error("GET /api/jobs unexpected error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
