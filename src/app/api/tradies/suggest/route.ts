import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// GET /api/tradies/suggest?job_id=... OR ?client_id=...
export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const jobId = url.searchParams.get('job_id');
    const clientId = url.searchParams.get('client_id');
    const supabase = createClient();

    let searchText: string | null = null;
    let region: string | null = null;

    if (jobId) {
      const { data: job } = await supabase.from('jobs').select('description, region').eq('id', jobId).single();
      searchText = job?.description ?? null;
      region = job?.region ?? null;
    } else if (clientId) {
      // look up the client's recent job descriptions to build a search
      const { data: jobs } = await supabase.from('jobs').select('description, region').eq('client_id', clientId).limit(5).order('created_at', { ascending: false });
  const js = (jobs as unknown[]) || [];
  searchText = js.map((j) => (j as Record<string, unknown>).description as string | undefined).filter(Boolean).join(' ');
      region = jobs && jobs[0]?.region ? jobs[0].region : null;
    }

    // Basic matching: search tradies by skills or bio matching words in searchText and prefer same region and high rating
    let query = supabase.from('tradies').select('id, name, trade, location, ratings').limit(50);
    if (searchText) {
      // use ilike on trade and bio fields as a heuristic
      const term = `%${searchText.split(/\s+/).slice(0,5).join(' ')}%`;
      query = query.ilike('trade', term).or(`bio.ilike.${term}`);
    }
    if (region) query = query.eq('location', region);

    const { data } = await query.order('ratings->>average', { ascending: false }).limit(20);
    return NextResponse.json({ suggestions: data || [] });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
