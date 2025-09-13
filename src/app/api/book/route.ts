import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase/server";

export async function POST(request: Request) {
  try {
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
