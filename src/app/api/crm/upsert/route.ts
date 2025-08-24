import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { upsertHubSpotContact } from "@/lib/crm/hubspot";

export async function POST() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  // Basic rate limit via noop (can extend later)
  // Fetch roles from compatibility view that prefers role_bindings when available.
  const { data: roleRows } = await supabase
    .from("user_roles_if_migrated")
    .select("role")
    .eq("user_id", user.id);
  const roles = (roleRows || []).map((r) => r.role as string);
  const result = await upsertHubSpotContact(user.email || "", roles);
  return NextResponse.json({ ok: true, result });
}
