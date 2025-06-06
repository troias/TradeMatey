// src/app/api/commissions/route.js
import { supabase } from "../../../lib/supabase";
import { NextResponse } from "next/server";

// Get commissions for current user (via bookings)
export async function GET(request) {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("commissions")
    .select("id, source_type, source_id, amount, created_at")
    .eq("source_type", "booking")
    .in(
      "source_id",
      supabase.from("bookings").select("id").eq("user_id", user.id)
    );

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}
