import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  try {
    const supabase = createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: analytics, error } = await supabase
      .from("analytics")
      .select("event_type, created_at, metadata")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(100);

    if (error) throw new Error(error.message);

    return NextResponse.json(analytics);
  } catch (error) {
    console.error("Analytics error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const { event_type, metadata } = await request.json();

    const supabase = createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const validEventTypes = [
      "job_posted",
      "job_accepted",
      "milestone_paid",
      "milestone_verified",
      "payment_received",
      "dispute_filed",
      "premium_subscribed",
      "referral_sent",
    ];
    if (!validEventTypes.includes(event_type)) {
      return NextResponse.json(
        { error: "Invalid event type" },
        { status: 400 }
      );
    }

    const { error } = await supabase.from("analytics").insert({
      user_id: user.id,
      event_type,
      metadata,
    });

    if (error) throw new Error(error.message);

    return NextResponse.json({ message: "Event logged" });
  } catch (error) {
    console.error("Analytics post error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
