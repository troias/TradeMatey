import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// POST { tradie_id, client_id, job_id?, milestone_id?, message? }
export async function POST(request: Request) {
  try {
    const body = (await request.json()) || {};
    const supabase = createClient();

    // Support both legacy single-offer body and a batch `offers` array
    const offersPayload: Array<{ tradie_id: string; client_id: string; job_id?: string | null; milestone_id?: string | null; message?: string | null }> =
      Array.isArray(body.offers) && body.offers.length > 0
        ? body.offers
        : body.tradie_id && body.client_id
        ? [{ tradie_id: body.tradie_id, client_id: body.client_id, job_id: body.job_id ?? null, milestone_id: body.milestone_id ?? null, message: body.message ?? null }]
        : [];

    if (offersPayload.length === 0) {
      return NextResponse.json({ error: 'No offers provided' }, { status: 400 });
    }

    // Insert all offers; map to DB rows
    const rows = offersPayload.map((o) => ({
      id: crypto.randomUUID(),
      tradie_id: o.tradie_id,
      client_id: o.client_id,
      job_id: o.job_id ?? null,
      milestone_id: o.milestone_id ?? null,
      message: o.message ?? null,
      status: 'sent',
      created_at: new Date().toISOString(),
    }));

    const { data, error } = await supabase.from('offers').insert(rows).select();
    if (error) throw error;

    // Notify each tradie (de-duplicate by tradie_id)
    const uniqTradies = Array.from(new Set(rows.map((r) => r.tradie_id)));
    if (uniqTradies.length > 0) {
      const notifs = uniqTradies.map((t) => ({ user_id: t, message: `You have a new job offer from a client`, is_read: false, created_at: new Date().toISOString() }));
      await supabase.from('notifications').insert(notifs);
    }

    return NextResponse.json({ offers: data ?? [] });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
