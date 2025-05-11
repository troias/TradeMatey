import { supabase } from "@/lib/supabase";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const { title, description, budget, client_id } = await request.json();

  const { data, error } = await supabase
  .from(’jobs’)
  .insert([{ title, description, budget, client_id }])
  .select();

  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
