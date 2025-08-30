import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const token = body?.token;
    const target_user_id = body?.target_user_id;
    if (!token || !target_user_id) return NextResponse.json({ error: "missing" }, { status: 400 });

    const supabase = createServerClient();
    const { data: { user }, error: userErr } = await supabase.auth.getUser();
    if (userErr || !user) return NextResponse.json({ error: "not_authenticated" }, { status: 401 });

    // ensure caller is admin
    const { data: rolesData } = await supabase.from("user_roles").select("role").eq("user_id", user.id);
  const roles = (rolesData || []).map((r: unknown) => (r as Record<string, unknown>).role as string);
    if (!roles.includes("admin")) return NextResponse.json({ error: "forbidden" }, { status: 403 });

    const { error } = await supabase.rpc("redeem_admin_invite", { p_token: token, p_user_id: target_user_id, p_actor_id: user.id });
    if (error) {
      const e = error as { code?: string; message?: string };
      switch (e.code) {
        case 'P0001':
        case 'P0006':
          return NextResponse.json({ error: e.message || 'not_found' }, { status: 404 });
        case 'P0003':
          return NextResponse.json({ error: 'invite_already_used' }, { status: 409 });
        case 'P0004':
          return NextResponse.json({ error: 'invite_expired' }, { status: 410 });
        case 'P0007':
          return NextResponse.json({ error: 'actor_not_admin' }, { status: 403 });
        default:
          return NextResponse.json({ error: e.message || 'rpc_error' }, { status: 400 });
      }
    }
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "failed" }, { status: 500 });
  }
}
