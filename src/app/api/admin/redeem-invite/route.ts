import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const token = body?.token;
    if (!token) return NextResponse.json({ error: "token required" }, { status: 400 });

    const supabase = createServerClient();
    // get current user from cookies
    const {
      data: { user },
      error: userErr,
    } = await supabase.auth.getUser();
    if (userErr || !user) return NextResponse.json({ error: "not_authenticated" }, { status: 401 });

    // Call Postgres RPC to redeem invite and grant admin role
    const { error } = await supabase.rpc("redeem_admin_invite", {
      p_token: token,
      p_user_id: user.id,
    });
    if (error) {
      // Map Postgres SQLSTATE codes to HTTP responses
  const e = error as { code?: string; message?: string };
  const code = e.code;
      switch (code) {
        case 'P0001': // invalid_invite
          return NextResponse.json({ error: 'invalid_invite' }, { status: 404 });
        case 'P0003': // invite_already_used
          return NextResponse.json({ error: 'invite_already_used' }, { status: 409 });
        case 'P0004': // invite_expired
          return NextResponse.json({ error: 'invite_expired' }, { status: 410 });
        case 'P0005': // invite_email_mismatch
          return NextResponse.json({ error: 'invite_email_mismatch' }, { status: 400 });
        case 'P0006': // user_not_found
          return NextResponse.json({ error: 'user_not_found' }, { status: 404 });
        case 'P0007': // actor_not_admin (shouldn't happen here)
          return NextResponse.json({ error: 'actor_not_admin' }, { status: 403 });
        default:
          return NextResponse.json({ error: error.message || 'rpc_error' }, { status: 400 });
      }
    }
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "failed to redeem" }, { status: 500 });
  }
}
