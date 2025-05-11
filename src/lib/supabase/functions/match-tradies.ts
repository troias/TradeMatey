
 import { supabase } from './ lib/ supabase ';
 export async function handler (req: Request ) {
 const { job_id } = await req.json ();
 const { data: job } = await supabase .from('jobs '). select ('
description ').eq('id ', job_id ). single ();
 const { data: tradies } = await supabase .from('tradies '). select (
'id , skills , location , ratings ');
 // AI matching logic (e.g., based on skills , location , ratings )
 const matchedTradies = tradies . filter ( tradie => /* matching
logic */);
 await supabase .from('jobs '). update ({ matched_tradies :
matchedTradies }).eq('id ', job_id );
 return new Response (JSON. stringify ({ success : true }));
 }