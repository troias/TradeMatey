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

    // Normalize results: ensure each tradie has `id` and `user_id` fields and
    // include safe display fields used by the UI.
    const normalized = (data || []).map((rowRaw: unknown) => {
      const row = (rowRaw as Record<string, unknown>) || {};
      const id = (row.id as string) || (row.user_id as string) || String(row.user_id ?? row.email ?? crypto.randomUUID());
      const user_id = (row.user_id as string) || (row.id as string) || id;
      return {
        id,
        user_id,
        location: (row.location as string) || null,
        ratings: (row.ratings as Record<string, unknown>) || { average: 0 },
        skills: (row.skills as unknown[]) || [],
        bio: (row.bio as string) || "",
        name: (row.name as string) || (row.display_name as string) || "",
        certifications: (row.certifications as unknown[]) || [],
        top_tradie: Boolean(row.top_tradie),
      };
    });

    return NextResponse.json(normalized, { status: 200 });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
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
  } catch (err: unknown) {
    console.error("Error updating availability:", err);
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
