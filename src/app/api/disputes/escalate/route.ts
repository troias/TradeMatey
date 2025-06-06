// src/app/api/disputes/escalate/route.ts
import { createServerClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
export async function PATCH(request) {
  const { dispute_id } = await request.json();
  const supabase = createServerClient(cookies());
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (profile.role !== "support")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { error } = await supabase
    .from("disputes")
    .update({ qbcc_escalated: true })
    .eq("id", dispute_id);
  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ message: "Dispute escalated to QBCC" });
}
