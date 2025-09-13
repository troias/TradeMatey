// src/app/api/bookings/route.js
import { NextResponse } from "next/server";
import requireSupabase from "@/lib/supabase/helpers";

// Get bookings for current user
export async function GET() {
  try {
    const supabase = requireSupabase();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

    const { data, error } = await supabase
      .from("bookings")
      .select("id, job_description, location, status, commission, created_at")
      .eq("user_id", user.id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (err: unknown) {
    const msg = err && typeof err === "object" && "message" in err ? (err as { message?: unknown }).message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// Create a booking
export async function POST(request: Request) {
  try {
    const supabase = requireSupabase();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

  const { job_description, location, job_cost, is_regional } =
    await request.json();
  if (!job_description || !location || !job_cost) {
    return NextResponse.json(
      { error: "Missing required fields" },
      { status: 400 }
    );
  }

  // Calculate commission: 3.33% of job_cost, capped at A$25 for regional jobs
  const commissionRate = 0.0333;
  let commission = job_cost * commissionRate;
  if (is_regional && commission > 25) {
    commission = 25;
  }

  const { data: booking, error: bookingError } = await supabase
    .from("bookings")
    .insert({
      user_id: user.id,
      job_description,
      location,
      status: "pending",
      commission,
      created_at: new Date().toISOString(),
    })
    .select("id, job_description, location, status, commission, created_at")
    .single();

    if (bookingError) {
      return NextResponse.json({ error: bookingError.message }, { status: 500 });
    }

  // Insert commission record
  const { error: commissionError } = await supabase.from("commissions").insert({
    id: crypto.randomUUID(),
    source_type: "booking",
    source_id: booking.id,
    amount: commission,
    created_at: new Date().toISOString(),
  });

    if (commissionError) {
      return NextResponse.json(
        { error: commissionError.message },
        { status: 500 }
      );
    }

    return NextResponse.json(booking);
  } catch (err: unknown) {
    const msg = err && typeof err === "object" && "message" in err ? (err as { message?: unknown }).message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
