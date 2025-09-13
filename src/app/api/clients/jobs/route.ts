import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const clientId = url.searchParams.get('client_id');
    if (!clientId) return NextResponse.json({ error: 'client_id required' }, { status: 400 });
    const supabase = createClient();
    const { data } = await supabase.from('jobs').select('id, title, milestones(id, title, amount, status)').eq('client_id', clientId).order('created_at', { ascending: false });
    return NextResponse.json({ jobs: data || [] });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
