import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
export async function POST(request: Request) {
  const { user_id, title, content } = await request.json();
  const { data, error } = await supabase
    .from("forum_posts")
    .insert([{ user_id, title, content }])
    .select();
  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
