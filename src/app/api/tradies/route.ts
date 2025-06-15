import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const trade = searchParams.get("trade");

    const supabase = createClient();

    let query = supabase
      .from("tradies")
      .select("id, user_id, location, ratings, skills, bio, certifications");

    if (trade) {
      // Convert trade to lowercase, wrap in JSON string array
      query = query.filter(
        "skills",
        "cs",
        JSON.stringify([trade.toLowerCase()])
      );
    }

    const { data, error } = await query.order("ratings->average", {
      ascending: false,
      nullsLast: true,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data || [], { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const { user_id, availability } = await request.json();

    const supabase = createClient();

    const { data: tradie, error: tradieError } = await supabase
      .from("tradies")
      .select("id")
      .eq("user_id", user_id)
      .single();

    if (tradieError || !tradie) {
      console.error("Tradie not found:", tradieError?.message);
      return NextResponse.json({ error: "Tradie not found" }, { status: 404 });
    }

    const { data, error } = await supabase
      .from("availability")
      .insert({
        id: crypto.randomUUID(),
        user_id: user_id,
        available_dates: { start: availability.start, end: availability.end },
      })
      .select();

    if (error) {
      console.error("Availability insert error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    console.log("Availability inserted:", data);

    return NextResponse.json({
      message: "Availability updated",
      data: data[0],
    });
  } catch (error) {
    console.error("Error updating availability:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
