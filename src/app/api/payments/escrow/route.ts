// src/app/api/payments/escrow/route.js
import { supabase } from "../../../../lib/supabase";
import { NextResponse } from "next/server";

// Create escrow payment
export async function POST(request) {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { booking_id, amount } = await request.json();
  if (!booking_id || !amount) {
    return NextResponse.json(
      { error: "Missing booking_id or amount" },
      { status: 400 }
    );
  }

  // Verify booking exists and belongs to user
  const { data: booking, error: bookingError } = await supabase
    .from("bookings")
    .select("id")
    .eq("id", booking_id)
    .eq("user_id", user.id)
    .single();

  if (bookingError || !booking) {
    return NextResponse.json({ error: "Booking not found" }, { status: 404 });
  }

  // Create payment in escrow
  const { data: payment, error: paymentError } = await supabase
    .from("payments")
    .insert({
      booking_id,
      amount,
      status: "held",
      created_at: new Date().toISOString(),
    })
    .select("id, booking_id, amount, status, created_at")
    .single();

  if (paymentError) {
    return NextResponse.json({ error: paymentError.message }, { status: 500 });
  }

  return NextResponse.json(payment);
}
