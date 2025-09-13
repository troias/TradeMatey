import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { milestone_id } = await request.json();
    if (!milestone_id) return NextResponse.json({ error: 'milestone_id required' }, { status: 400 });

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // Ensure milestone belongs to a job where the tradie is the assigned tradie
    const { data: milestone, error: mErr } = await supabase
      .from('milestones')
      .select('id, job_id, tradie_id, status')
      .eq('id', milestone_id)
      .single();
    if (mErr || !milestone) return NextResponse.json({ error: 'Milestone not found' }, { status: 404 });
    if (milestone.tradie_id !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    // Mark as pending payment (tradie requested payment). Record timestamp so 14-day QBCC window can be calculated from requested_at.
    const now = new Date().toISOString();
    const { data: updated, error: updErr } = await supabase
      .from('milestones')
      .update({ status: 'pending', requested_at: now, completed_at: now })
      .eq('id', milestone_id)
      .select('*, job_id, title, client_id')
      .single();
    if (updErr) return NextResponse.json({ error: 'Failed to mark completed' }, { status: 500 });
    // Notify client (best-effort)
    try {
      if (updated?.client_id) {
        await supabase.from('notifications').insert({ user_id: updated.client_id, job_id: updated.job_id, message: `Tradie has requested payment for milestone: ${updated.title}` });
      }
    } catch {}

    return NextResponse.json({ milestone: updated });
  } catch (err) {
    console.error('request-payment error', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
