import { createServerClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function POST(request: Request) {
  try {
    const { jobId, content, receiverId } = await request.json();
    const cookieStore = cookies();
    const supabase = createServerClient(cookieStore);

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: job, error: jobError } = await supabase
      .from("jobs")
      .select("client_id, tradie_id")
      .eq("id", jobId)
      .single();

    if (jobError || !job)
      return NextResponse.json({ error: "Job not found" }, { status: 404 });

    if (
      ![job.client_id, job.tradie_id].includes(user.id) ||
      ![job.client_id, job.tradie_id].includes(receiverId)
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { data: message, error: messageError } = await supabase
      .from("messages")
      .insert({
        sender_id: user.id,
        receiver_id: receiverId,
        content,
        job_id: jobId,
      })
      .select()
      .single();

    if (messageError) throw new Error(messageError.message);

    await supabase.from("notifications").insert({
      user_id: receiverId,
      message: `New message for job ${jobId}`,
      job_id: jobId,
    });

    return NextResponse.json(message);
  } catch (error) {
    console.error("Message error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
