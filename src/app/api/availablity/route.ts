// src/app/api/availablity/route.ts
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

// Get current user's availability
export async function GET() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return NextResponse.json({ error: "Supabase not configured (missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY)" }, { status: 500 });
  }
  const supabase = createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("availability")
    .select("id, available_dates, updated_at")
    .eq("user_id", user.id)
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data || { available_dates: {} });
}

// Update availability
export async function POST(request) {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return NextResponse.json({ error: "Supabase not configured (missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY)" }, { status: 500 });
  }
  const supabase = createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { available_dates } = await request.json();
  if (!available_dates) {
    return NextResponse.json(
      { error: "Missing available_dates" },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from("availability")
    .upsert(
      {
        user_id: user.id,
        available_dates,
        updated_at: new Date().toISOString(),
      },
      { onConflict: ["user_id"] }
    )
    .select("id, available_dates, updated_at")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}
