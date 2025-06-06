import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const trade = searchParams.get("trade");

    const cookieStore = cookies();
    const supabase = createServerClient(cookieStore);

    let query = supabase
      .from("tradies")
      .select("id, user_id, trade, region, ratings")
      .eq("verified", true); // Assuming tradies need verification

    if (trade) query = query.eq("trade", trade);

    const { data, error } = await query.order("ratings", { ascending: false });
    if (error) throw error;

    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const { user_id, availability } = await request.json();
    const cookieStore = cookies();
    const supabase = createServerClient(cookieStore);

    const { data: tradie, error: tradieError } = await supabase
      .from("tradies")
      .select("id")
      .eq("user_id", user_id)
      .single();

    if (tradieError || !tradie) {
      return NextResponse.json({ error: "Tradie not found" }, { status: 404 });
    }

    const { data, error } = await supabase
      .from("availability")
      .insert({
        tradie_id: tradie.id,
        start_time: availability.start,
        end_time: availability.end,
      })
      .select();

    if (error) throw error;
    return NextResponse.json({
      message: "Availability updated",
      data: data[0],
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
