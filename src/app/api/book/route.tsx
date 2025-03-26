import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/db";

export async function POST(req: NextRequest) {
  const { jobDescription, location, userId } = await req.json();

  const { data, error } = await supabase.from("bookings").insert([
    {
      job_description: jobDescription,
      location,
      user_id: userId || "anonymous",
      status: "pending",
      commission: 0.1 * 200, // Dummy $200 job, 10% commission
    },
  ]);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ message: "Booking requested!", data });
}
