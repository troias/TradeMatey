import { NextResponse } from "next/server";
import { createServiceSupabase } from "@/lib/supabase/service"; // server-only service client helper

export async function POST(req: Request) {
  const body = await req.json();
  const { token } = body;
  if (!token) return NextResponse.json({ error: "token required" }, { status: 400 });

  const supabase = createServiceSupabase(); // uses SUPABASE_SERVICE_ROLE_KEY

  // get session user (ensure this endpoint is called in server context that forwards cookies)
  const { data: { user }, error: userErr } = await supabase.auth.getUser();
  if (userErr || !user?.id) return NextResponse.json({ error: "not_authenticated" }, { status: 401 });

  // verify admin role
  const { data: roles } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id)
    .eq("role", "admin")
    .limit(1);
  if (!roles || roles.length === 0) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  // approve invite (server uses service role so it can update any rows)
  const { error } = await supabase
    .from("admin_invites")
    .update({ status: "approved", approved_by: user.id, approved_at: new Date().toISOString() })
    .eq("token", token)
    .eq("status", "pending");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  // optional: insert admin_audit row here
  return NextResponse.json({ ok: true });
}