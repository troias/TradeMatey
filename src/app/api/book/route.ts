import { NextResponse } from "next/server";
import requireSupabase from "@/lib/supabase/helpers";

export async function POST(request: Request) {
  try {
    const supabase = requireSupabase();
    const { jobDescription, location, userId } = await request.json();
    const { data, error } = await supabase
      .from("jobs")
      .insert([
        {
          title: jobDescription,
          description: jobDescription,
          client_id: userId,
          location,
          status: "open",
          payment_type: "milestone",
        },
      ])
      .select()
      .single();
    if (error) throw error;
    return NextResponse.json(data);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
