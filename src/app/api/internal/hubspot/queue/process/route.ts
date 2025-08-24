import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import {
  upsertHubSpotContact,
  HubSpotContactUpsertResult,
} from "@/lib/crm/hubspot";

// Process a batch of queued HubSpot sync jobs. Protect via secret header or restricted invocation (cron job).
export async function POST(req: Request) {
  const authHeader = req.headers.get("x-cron-secret");
  const expected = process.env.CRON_SECRET;
  if (!expected || authHeader !== expected) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const limit = 50; // batch size
  const service = createServiceClient();
  // Lock rows
  const { data: queueRows, error } = await service.rpc(
    "lock_hubspot_sync_queue",
    { p_limit: limit }
  );
  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });
  if (!queueRows?.length) return NextResponse.json({ processed: 0 });

  // Pre-fetch roles for all users in batch
  interface QueueRow {
    id: number;
    user_id: string;
    attempt: number;
  }
  const ids = (queueRows as QueueRow[]).map((r) => r.user_id);
  const { data: roleRows } = await service
    .from("user_roles")
    .select("user_id, role")
    .in("user_id", ids);
  const roleMap = new Map<string, string[]>();
  (roleRows || []).forEach((r) => {
    if (!roleMap.has(r.user_id)) roleMap.set(r.user_id, []);
    roleMap.get(r.user_id)!.push(r.role);
  });

  // Need emails -> fetch from auth admin list (could optimize with single listUsers pagination but small batch ok)
  const emailMap = new Map<string, string>();
  // Future: direct per-user admin lookup if SDK adds method.
  // As fallback, attempt to get emails through a single page list large enough
  const list = await service.auth.admin.listUsers({ page: 0, perPage: 1000 });
  list.data?.users?.forEach((u) => {
    if (ids.includes(u.id) && u.email) emailMap.set(u.id, u.email);
  });

  const results: {
    id: number;
    result?: HubSpotContactUpsertResult;
    skipped?: boolean;
  }[] = [];
  for (const row of queueRows as QueueRow[]) {
    const roles = roleMap.get(row.user_id) || [];
    const email = emailMap.get(row.user_id);
    if (!email || !roles.length) {
      await service
        .from("hubspot_sync_queue")
        .update({
          attempt: row.attempt + 1,
          next_run_at: new Date(Date.now() + 60_000),
          locked_at: null,
          last_error: "missing_email_or_roles",
        })
        .eq("id", row.id);
      results.push({ id: row.id, skipped: true });
      continue;
    }
    const res = await upsertHubSpotContact(email, roles);
    if (res.skipped) {
      // schedule retry with exponential backoff
      const delay = Math.min(2 ** (row.attempt + 1) * 60000, 60 * 60 * 1000);
      await service
        .from("hubspot_sync_queue")
        .update({
          attempt: row.attempt + 1,
          next_run_at: new Date(Date.now() + delay),
          locked_at: null,
          last_error: res.reason || "unknown",
        })
        .eq("id", row.id);
    } else {
      await service.from("hubspot_sync_queue").delete().eq("id", row.id);
    }
    results.push({ id: row.id, result: res });
  }
  return NextResponse.json({ processed: results.length, results });
}
