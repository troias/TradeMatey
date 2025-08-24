import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";

export async function POST(req: Request) {
  const supabase = createServerClient();
  const body = await req.json();
  const { targetUserId, role, reason } = body ?? {};

  if (!targetUserId || !role) {
    return NextResponse.json(
      { error: "missing targetUserId or role" },
      { status: 400 }
    );
  }

  const { data: sessionData } = await supabase.auth.getUser();
  const actor = sessionData?.user?.id;
  if (!actor)
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  // create pending change
  const { error } = await supabase
    .from("pending_role_changes")
    .insert([
      { target_user_id: targetUserId, role, reason, requested_by: actor },
    ]);
  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ status: "ok" });
}
