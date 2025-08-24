import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";

export async function POST(req: Request) {
  const supabase = createServerClient();
  const body = await req.json();
  const { id: dlqId } = body ?? {};
  const { data: sessionData } = await supabase.auth.getUser();
  const actor = sessionData?.user?.id;
  if (!actor)
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const { data: roles } = await supabase
    .from("user_roles_if_migrated")
    .select("role")
    .eq("user_id", actor)
    .eq("role", "admin")
    .limit(1);
  if (!roles || roles.length === 0)
    return NextResponse.json({ error: "forbidden" }, { status: 403 });

  if (!dlqId)
    return NextResponse.json({ error: "missing id" }, { status: 400 });

  const { data: dlqRow, error: dlqErr } = await supabase
    .from("hubspot_dlq")
    .select("*")
    .eq("id", dlqId)
    .single();
  if (dlqErr || !dlqRow)
    return NextResponse.json(
      { error: dlqErr?.message ?? "not_found" },
      { status: 404 }
    );

  // requeue: insert into hubspot_sync_queue with reset attempts and remove DLQ
  const { error: insErr } = await supabase
    .from("hubspot_sync_queue")
    .insert([
      {
        user_id: dlqRow.user_id,
        next_run_at: new Date().toISOString(),
        attempts: 0,
      },
    ]);
  if (insErr)
    return NextResponse.json({ error: insErr.message }, { status: 500 });

  await supabase.from("hubspot_dlq").delete().eq("id", dlqId);
  return NextResponse.json({ status: "ok" });
}
