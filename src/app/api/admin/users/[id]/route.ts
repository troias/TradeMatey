import { NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";

type RoleRow = { role: string };
type RpcResult = { success?: boolean } | Record<string, unknown> | null;
type RpcError = { message?: string; code?: string } | null;

type SupabaseSelectResult<T> = { data: T[] | null; error: unknown };
type SupabaseRpcResult = { data: RpcResult | null; error: RpcError };

// Route: DELETE -> soft-delete user (admin only), POST -> restore user
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  const supabase = createServerClient();
  const { data: authData } = await supabase.auth.getUser();
  const actor = authData.user;
  if (!actor)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const targetId = params.id;

  // Check admin role (use role_bindings if present, otherwise fallback to user_roles)
  // Check admin role via the compatibility view which prefers role_bindings
  const rolesRes = (await supabase
    .from("user_roles_if_migrated")
    .select("role")
    .eq("user_id", actor.id)) as SupabaseSelectResult<RoleRow>;
  const roles = rolesRes.data ?? [];
  const isAdmin = roles.some((r: RoleRow) => r.role === "admin");
  if (!isAdmin)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const idempotencyKey = request.headers.get("x-idempotency-key") || undefined;
  const requestId = request.headers.get("x-request-id") || undefined;
  const surface = request.headers.get("x-surface") || "AdminAPI";

  // Parse optional reason from body
  let reason: string | undefined = undefined;
  try {
    const body = (await request.json().catch(() => null)) as Record<
      string,
      unknown
    > | null;
    if (body && typeof body === "object" && typeof body.reason === "string")
      reason = body.reason;
  } catch {}

  try {
    const rpcArgs = {
      p_target: targetId,
      p_actor: actor.id,
      p_reason: reason,
      p_surface: surface,
      p_request_id: requestId,
      p_idempotency_key: idempotencyKey,
    } as Record<string, unknown>;

    const rpcRes = (await supabase
      .rpc("soft_delete_user", rpcArgs)
      .maybeSingle()) as SupabaseRpcResult;
    const { data, error } = rpcRes;
    if (error) {
      console.error("soft_delete_user RPC error:", error);
      const err = error ?? {};
      if (err.code === "PGRST116" || err.message?.includes("not_found")) {
        return NextResponse.json({ error: "Not Found" }, { status: 404 });
      }
      if (err.message?.includes("permission_denied")) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      return NextResponse.json(
        { error: "Internal RPC error" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, result: data });
  } catch (e) {
    console.error("Admin delete error:", e);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const supabase = createServerClient();
  const { data: authData } = await supabase.auth.getUser();
  const actor = authData.user;
  if (!actor)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const targetId = params.id;

  // Admin check
  // Admin check via compatibility view
  const rolesRes2 = (await supabase
    .from("user_roles_if_migrated")
    .select("role")
    .eq("user_id", actor.id)) as SupabaseSelectResult<RoleRow>;
  const roles2 = rolesRes2.data ?? [];
  const isAdmin2 = roles2.some((r: RoleRow) => r.role === "admin");
  if (!isAdmin2)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const requestId = request.headers.get("x-request-id") || undefined;
  const surface = request.headers.get("x-surface") || "AdminAPI";

  try {
    const rpcRes2 = (await supabase
      .rpc("restore_user", {
        p_target: targetId,
        p_actor: actor.id,
        p_request_id: requestId,
        p_surface: surface,
      } as Record<string, unknown>)
      .maybeSingle()) as SupabaseRpcResult;
    const { data, error } = rpcRes2;
    if (error) {
      console.error("restore_user RPC error:", error);
      const err = error ?? {};
      if (err.message?.includes("not_found"))
        return NextResponse.json({ error: "Not Found" }, { status: 404 });
      if (err.message?.includes("permission_denied"))
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      return NextResponse.json(
        { error: "Internal RPC error" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, result: data });
  } catch (e) {
    console.error("Admin restore error:", e);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
