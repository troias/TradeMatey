import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";

export async function POST(request: Request) {
  if (process.env.DEBUG_ALLOW_ROLE_API !== "true") {
    return NextResponse.json({ ok: false, error: "disabled" }, { status: 403 });
  }
  try {
    const body = await request.json();
  const { user_id, role } = body as { user_id?: string; role?: string };
    if (!user_id || !role) {
      return NextResponse.json({ ok: false, error: "missing_params" }, { status: 400 });
    }
    const svc = createServiceClient();
    const { error } = await svc.rpc("ensure_primary_role", { p_user_id: user_id, p_role: role });
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
