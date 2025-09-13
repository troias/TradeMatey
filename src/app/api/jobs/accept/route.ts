import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { getLogger } from '@/lib/logger';

export async function POST(request: Request) {
  try {
  const _reqHeaders = (request as any)?.headers;
  const requestId = typeof _reqHeaders?.get === 'function' ? _reqHeaders.get('x-request-id') : undefined;
  const baseLog = getLogger({ requestId });
    const { job_id, tradie_id, assign_milestones } = await request.json();
    // default: assign milestones to accepted tradie unless caller opts out
    const shouldAssignMilestones = assign_milestones !== false;
    if (!job_id || !tradie_id) return NextResponse.json({ error: "job_id and tradie_id required" }, { status: 400 });

    const supabase = createClient();

  // Test shortcut: allow a trusted local test runner to authenticate as the
  // seeded client by sending the TEST_SEED_TOKEN in the x-test-seed-token
  // header. This keeps production safety (token must match) while allowing
  // Playwright to exercise UI flows without performing a full OIDC sign-in.
  const testToken = typeof _reqHeaders?.get === 'function' ? _reqHeaders.get('x-test-seed-token') : undefined;
    const seedToken = process.env.TEST_SEED_TOKEN;
    let userIdFromAuth: string | undefined;
    if (testToken && seedToken && testToken === seedToken) {
      userIdFromAuth = process.env.E2E_SEED_CLIENT_ID || 'seed_client_001';
    } else {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      userIdFromAuth = user.id;
    }

    const log = baseLog.child({ userId: userIdFromAuth });

    // Ensure requester is the client who owns the job
    const { data: job, error: jobErr } = await supabase.from("jobs").select("client_id").eq("id", job_id).single();
    if (jobErr || !job) return NextResponse.json({ error: "Job not found" }, { status: 404 });
  if (job.client_id !== userIdFromAuth) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    // Mark all other interests as rejected and this one accepted

    const { error: rejErr } = await supabase.from("job_interest").update({ status: 'rejected', updated_at: new Date().toISOString() }).eq('job_id', job_id).neq('tradie_id', tradie_id);
    if (rejErr) log.warn('Failed to reject other interests', { err: String(rejErr) });

  const { error: accErr } = await supabase.from("job_interest").upsert({ job_id, tradie_id, status: 'accepted', accepted_at: new Date().toISOString(), accepted_by: userIdFromAuth }, { onConflict: 'job_id,tradie_id' });
    if (accErr) {
      await log.error('Failed to upsert accepted tradie', { err: String(accErr) });
      return NextResponse.json({ error: 'Failed to accept tradie' }, { status: 500 });
    }

    // Update job to lock in tradie
    const { data: updatedJob, error: updateJobErr } = await supabase.from('jobs').update({ tradie_id, status: 'in_progress' }).eq('id', job_id).select().single();
    if (updateJobErr) {
      await log.error('Failed to update job', { err: String(updateJobErr) });
      return NextResponse.json({ error: "Failed to update job" }, { status: 500 });
    }

    // Assign tradie to any unassigned milestones for this job (safe default)
    if (shouldAssignMilestones) {
      try {
        await supabase
          .from('milestones')
          .update({ tradie_id })
          .eq('job_id', job_id)
          .is('tradie_id', null);
      } catch (e) {
        log.warn('Failed to assign milestones to tradie', { err: String(e) });
      }
    }

    // Notify tradie (best-effort)
    try {
      await supabase.from('notifications').insert({ user_id: tradie_id, message: `You've been accepted for job ${job_id}`, job_id });
    } catch (e) {
      log.warn('Failed to insert notification for accept', { err: String(e) });
    }

    return NextResponse.json({ job: updatedJob });
  } catch (err) {
    // production-safe structured logging
    const requestId = (request.headers.get('x-request-id')) ?? undefined;
    const log = getLogger({ requestId });
    await log.error('/api/jobs/accept error', { err: String(err) });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
