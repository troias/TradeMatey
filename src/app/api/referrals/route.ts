import { createServerClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function POST(request: Request) {
  try {
    const { referredEmail } = await request.json();
    const cookieStore = cookies();
    const supabase = createServerClient(cookieStore);

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { error } = await supabase.from("referrals").insert({
      referrer_id: user.id,
      referred_email: referredEmail,
    });

    if (error) throw new Error(error.message);

    return NextResponse.json({ message: "Referral created" });
  } catch (error) {
    console.error("Referral error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
