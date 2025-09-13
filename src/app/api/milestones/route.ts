import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const milestone_id = searchParams.get('milestone_id');
  if (!milestone_id) {
    return NextResponse.json({ error: 'milestone_id required' }, { status: 400 });
  }
  const supabase = createClient();
  const { data: milestone, error } = await supabase
    .from('milestones')
    .select('*')
    .eq('id', milestone_id)
    .single();
  if (error || !milestone) {
    return NextResponse.json({ error: 'Milestone not found' }, { status: 404 });
  }
  return NextResponse.json(milestone);
}
