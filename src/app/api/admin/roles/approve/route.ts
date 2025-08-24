import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";

type Approval = { approver: string; at: string; approve: boolean };

export async function POST(req: Request) {
  const supabase = createServerClient();
  const body = await req.json();
  const { pendingId, approve } = body;

  const { data: sessionData } = await supabase.auth.getUser();
  const actor = sessionData?.user?.id;
  if (!actor)
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  // fetch pending
  const { data: pending, error: fetchErr } = await supabase
    .from("pending_role_changes")
    .select("*")
    .eq("id", pendingId)
    .single();
  if (fetchErr)
    return NextResponse.json({ error: fetchErr.message }, { status: 500 });
  if (!pending)
    return NextResponse.json({ error: "not_found" }, { status: 404 });

  // simple approval: record approver and when enough approvals (2) call apply_pending_role_change
  const approvals: Approval[] = Array.isArray(pending.approvals)
    ? pending.approvals
    : [];
  approvals.push({
    approver: actor,
    at: new Date().toISOString(),
    approve: !!approve,
  });

  const newStatus =
    approvals.filter((a) => a.approve).length >= 2 ? "approved" : "pending";

  const { error: updErr } = await supabase
    .from("pending_role_changes")
    .update({
      approvals: approvals,
      status: newStatus,
      updated_at: new Date().toISOString(),
    })
    .eq("id", pendingId);
  if (updErr)
    return NextResponse.json({ error: updErr.message }, { status: 500 });

  if (newStatus === "approved") {
    // call RPC to apply
    const { error: rpcErr } = await supabase.rpc("apply_pending_role_change", {
      p_id: pendingId,
      p_actor: actor,
    });
    if (rpcErr)
      return NextResponse.json({ error: rpcErr.message }, { status: 500 });
  }

  return NextResponse.json({ status: "ok", newStatus });
}
