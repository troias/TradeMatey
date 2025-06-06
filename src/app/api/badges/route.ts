// src/app/api/badges/route.js
import { supabase } from "../../../lib/supabase";
import { NextResponse } from "next/server";

// Get user's badges
export async function GET(request) {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("badges")
    .select("id, badge, earned_at")
    .eq("user_id", user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

// Award a badge (admin only, assumes profile role check)
export async function POST(request) {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Check if user is admin (via profiles.role)
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (profileError || profile.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { user_id, badge } = await request.json();
  if (!user_id || !badge) {
    return NextResponse.json(
      { error: "Missing user_id or badge" },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from("badges")
    .insert({
      user_id,
      badge,
      earned_at: new Date().toISOString(),
    })
    .select("id, badge, earned_at")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}
