
import { supabase } from './ lib/ supabase ';
export async function handler(req: Request) {
    const { job_id } = await req.json();
    const { data: job } = await supabase.from('jobs ').select('
description ').eq('id ', job_id ). single ();
 const { data: tradies } = await supabase.from('tradies ').select(
        'id , skills , location , ratings ');

    const matchedTradies = await supabase
        .from("tradies")
        .select("*, availability(available_dates)")
        .ilike("skills", `%${job.description}%`)
        .eq("location", job.region);


  

    await supabase.from('jobs ').update({
        matched_tradies:
            matchedTradies
    }).eq('id ', job_id);
    return new Response(JSON.stringify({ success: true }));
}