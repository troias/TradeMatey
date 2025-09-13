import { NextResponse } from "next/server";
import requireSupabase from "@/lib/supabase/helpers";
export async function POST(request: Request) {
  const { user_id, title, content } = await request.json();
  try {
    const supabase = requireSupabase();
    const { data, error } = await supabase
      .from("forum_posts")
      .insert([{ user_id, title, content }])
      .select();
    if (error)
      return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
  } catch (err: unknown) {
    const msg = err && typeof err === "object" && "message" in err ? (err as { message?: unknown }).message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
