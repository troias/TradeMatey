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

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profileError || profile?.role !== "client") {
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
      return {
        title: m.title,
        description: m.description,
        amount: Math.round(amt * 100) / 100,
        due_date: m.due_date ?? null,
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

    const { data: job, error: jobError } = await supabase
      .from("jobs")
      .insert({
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

    if (jobError) throw new Error(jobError.message);

    const milestoneInserts = normalizedMilestones.map(
      (m: NormalizedMilestone) => ({
        job_id: job.id,
        title: m.title,
        description: m.description,
        amount: m.amount,
        due_date: m.due_date,
        status: "pending",
      })
    );

    const { error: milestoneError } = await supabase
      .from("milestones")
      .insert(milestoneInserts);
    if (milestoneError) throw new Error(milestoneError.message);

    return NextResponse.json({ job, milestones: milestoneInserts });
  } catch (error) {
    console.error("Job creation error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
