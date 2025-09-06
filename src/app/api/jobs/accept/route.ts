import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const { job_id, tradie_id } = await request.json();
    if (!job_id || !tradie_id) return NextResponse.json({ error: "job_id and tradie_id required" }, { status: 400 });

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // Ensure requester is the client who owns the job
    const { data: job, error: jobErr } = await supabase.from("jobs").select("client_id").eq("id", job_id).single();
    if (jobErr || !job) return NextResponse.json({ error: "Job not found" }, { status: 404 });
    if (job.client_id !== user.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    // Mark all other interests as rejected and this one accepted
    const { error: rejErr } = await supabase.from("job_interest").update({ status: 'rejected', updated_at: new Date().toISOString() }).eq('job_id', job_id).neq('tradie_id', tradie_id);
    if (rejErr) console.warn('Failed to reject other interests', rejErr);

    const { error: accErr } = await supabase.from("job_interest").upsert({ job_id, tradie_id, status: 'accepted', accepted_at: new Date().toISOString(), accepted_by: user.id }, { onConflict: ['job_id','tradie_id'] });
    if (accErr) return NextResponse.json({ error: "Failed to accept tradie" }, { status: 500 });

    // Update job to lock in tradie
    const { data: updatedJob, error: updateJobErr } = await supabase.from('jobs').update({ tradie_id, status: 'in_progress' }).eq('id', job_id).select().single();
    if (updateJobErr) return NextResponse.json({ error: "Failed to update job" }, { status: 500 });

    // Notify tradie (best-effort)
    try {
      await supabase.from('notifications').insert({ user_id: tradie_id, message: `You've been accepted for job ${job_id}`, job_id });
    } catch {}

    return NextResponse.json({ job: updatedJob });
  } catch (err) {
    console.error('/api/jobs/accept error', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
