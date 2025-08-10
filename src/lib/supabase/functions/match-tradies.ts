import { createClient } from "@/lib/supabase/client"; // or server if running on server
const supabase = createClient();

export async function handler(req: Request) {
  const { job_id } = await req.json();

  const { data: job } = await supabase
    .from('jobs')
    .select('description, location')
    .eq('id', job_id)
    .single();

  if (!job) {
    return new Response(JSON.stringify({ success: false, error: 'Job not found' }), { status: 404 });
  }

  const { data: tradies } = await supabase
    .from('tradies')
    .select('id, skills, location, ratings, availability(available_dates)')
    .ilike('skills', `%${job.description}%`)
    .eq('location', job.location);

  if (!tradies) {
    return new Response(JSON.stringify({ success: false, error: 'No tradies found' }), { status: 404 });
  }

  const matchedTradies = tradies.filter((tradie) => {
    const skillMatch = tradie.skills?.some((skill: string) =>
      job.description.toLowerCase().includes(skill.toLowerCase())
    );
    const locationMatch = calculateDistance(tradie.location, job.location) < 50;
    return skillMatch && locationMatch && tradie.ratings >= 4;
  });

  await supabase
    .from('jobs')
    .update({ matched_tradies: matchedTradies })
    .eq('id', job_id);

  return new Response(JSON.stringify({ success: true, matchedCount: matchedTradies.length }));
}

// Dummy function: replace with your actual distance calc
function calculateDistance(l
