import { createServerClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function POST(request: Request) {
  try {
    const { title, description, budget, milestones, region } =
      await request.json();
    const cookieStore = cookies();
    const supabase = createServerClient(cookieStore);

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

    const { data: job, error: jobError } = await supabase
      .from("jobs")
      .insert({
        title,
        description,
        budget,
        client_id: user.id,
        status: "pending",
        payment_type: "milestone",
        region,
      })
      .select()
      .single();

    if (jobError) throw new Error(jobError.message);

    const milestoneInserts = (Array.isArray(milestones) ? milestones : []).map((m: unknown) => {
      const mm = m as Record<string, unknown>;
      return {
        job_id: job.id,
        title: typeof mm.title === "string" ? mm.title : "",
        description: typeof mm.description === "string" ? mm.description : "",
        amount: typeof mm.amount === "number" ? mm.amount : 0,
        due_date: typeof mm.due_date === "string" ? mm.due_date : null,
        status: "pending",
      };
    });

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
