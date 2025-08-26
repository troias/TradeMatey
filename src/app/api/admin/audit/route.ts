import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = createServerClient();
    const {
      data: { user },
      error: userErr,
    } = await supabase.auth.getUser();
    if (userErr || !user) return NextResponse.json({ error: "not_authenticated" }, { status: 401 });

    const { data: rolesData } = await supabase.from("user_roles").select("role").eq("user_id", user.id);
    const roles = (rolesData || []).map((r: unknown) => (r as Record<string, unknown>).role as string);
    if (!roles.includes("admin")) return NextResponse.json({ error: "forbidden" }, { status: 403 });

    const { data, error } = await supabase
      .from("admin_audit")
      .select("id, token, target_user_id, actor_user_id, action, created_at")
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ data });
  } catch {
    return NextResponse.json({ error: "failed" }, { status: 500 });
  }
}
