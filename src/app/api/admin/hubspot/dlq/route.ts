import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = createServerClient();
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

  const { data, error } = await supabase
    .from("hubspot_dlq")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(200);
  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}
