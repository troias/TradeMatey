import { NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";

// Employee-facing Admin UI endpoint to confirm destructive actions.
// This endpoint requires the employee to be authenticated in your Admin UI and uses
// the server Supabase client (which should be able to get the current user session).
export async function POST(request: Request) {
  const supabase = createServerClient();
  const { data: auth } = await supabase.auth.getUser();
  const actor = auth.user;
  if (!actor)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = (await request.json().catch(() => null)) as Record<
      string,
      unknown
    > | null;
    const targetId =
      (body?.externalUserId as string) || (body?.targetId as string) || null;
    const reason = (body?.reason as string) || "requested_via_admin_ui";
    const idempotencyKey =
      (body?.idempotencyKey as string) || `ui-${Date.now()}-${Math.random()}`;

    if (!targetId)
      return NextResponse.json({ error: "missing_target" }, { status: 400 });

    const rpcArgs = {
      p_target: targetId,
      p_actor: actor.id,
      p_reason: reason,
      p_surface: "AdminUI",
      p_request_id: body?.requestId || null,
      p_idempotency_key: idempotencyKey,
    } as Record<string, unknown>;

    const rpcRes = await supabase
      .rpc("soft_delete_user", rpcArgs)
      .maybeSingle();
  // @ts-expect-error - keep error mapping simple here
    if (rpcRes?.error) {
      console.error("admin ui soft_delete_user rpc error", rpcRes.error);
      return NextResponse.json({ error: "rpc_error" }, { status: 500 });
    }

    return NextResponse.json({ success: true, result: rpcRes.data });
  } catch (e) {
    console.error("admin ui delete error", e);
    return NextResponse.json({ error: "internal" }, { status: 500 });
  }
}
