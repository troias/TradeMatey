import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";

export async function GET() {
  try {
    const cookieStore = cookies();
    const supabase = createServerClient(cookieStore);

    const { data, error } = await supabase
      .from("community")
      .select("id, user_id, post_id, content, created_at, users(name)")
      .order("created_at", { ascending: false });

    if (error) throw error;
    return NextResponse.json(data);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { user_id, content } = await request.json();
    const cookieStore = cookies();
    const supabase = createServerClient(cookieStore);

    const { data, error } = await supabase
      .from("community")
      .insert([{ user_id, content }])
      .select();

    if (error) throw error;
    return NextResponse.json(data[0]);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
