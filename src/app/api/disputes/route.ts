import { createServerClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function POST(request: Request) {
  try {
    const { milestoneId, reason } = await request.json();
    const cookieStore = cookies();
    const supabase = createServerClient(cookieStore);

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: milestone, error: milestoneError } = await supabase
      .from("milestones")
      .select("*, jobs!inner(client_id, tradie_id)")
      .eq("id", milestoneId)
      .single();

    if (milestoneError || !milestone) {
      return NextResponse.json(
        { error: "Milestone not found" },
        { status: 404 }
      );
    }

    if (
      ![milestone.jobs.client_id, milestone.jobs.tradie_id].includes(user.id)
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { data: dispute, error: disputeError } = await supabase
      .from("disputes")
      .insert({
        milestone_id: milestoneId,
        job_id: milestone.job_id,
        reason,
        status: "pending",
        qbcc_escalated: false,
      })
      .select()
      .single();

    if (disputeError) throw new Error(disputeError.message);

    await supabase.from("notifications").insert([
      {
        user_id: milestone.jobs.client_id,
        message: `Dispute filed for milestone ${milestone.title}`,
        job_id: milestone.job_id,
      },
      {
        user_id: milestone.jobs.tradie_id,
        message: `Dispute filed for milestone ${milestone.title}`,
        job_id: milestone.job_id,
      },
    ]);

    return NextResponse.json(dispute);
  } catch (error) {
    console.error("Dispute error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
