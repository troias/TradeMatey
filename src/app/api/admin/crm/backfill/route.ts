import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import {
  upsertHubSpotContact,
  HubSpotContactUpsertResult,
} from "@/lib/crm/hubspot";

// Admin-only endpoint to (re)sync all users & their roles to HubSpot.
// Batch via ?cursor=0&perPage=100 (cursor is page index for Supabase admin list)

export async function POST(req: Request) {
  const url = new URL(req.url);
  const page = parseInt(url.searchParams.get("cursor") || "0", 10);
  const perPage = Math.min(
    parseInt(url.searchParams.get("perPage") || "100", 10),
    500
  );

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { data: adminRole } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id)
    .eq("role", "admin")
    .maybeSingle();
  if (!adminRole)
    return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const service = createServiceClient();
  const list = await service.auth.admin.listUsers({ page, perPage });
  const users = list?.data?.users || [];
  if (!users.length) {
    return NextResponse.json({ done: true, page, perPage, processed: 0 });
  }
  const ids = users.map((u) => u.id);
  const { data: roleRows } = await service
    .from("user_roles")
    .select("user_id, role")
    .in("user_id", ids);
  const roleMap = new Map<string, string[]>();
  (roleRows || []).forEach((r) => {
    if (!roleMap.has(r.user_id)) roleMap.set(r.user_id, []);
    roleMap.get(r.user_id)!.push(r.role);
  });

  const results: (
    | HubSpotContactUpsertResult
    | { skipped: true; reason: string; id?: string; email?: string }
  )[] = [];
  for (const u of users) {
    const email = u.email || "";
    if (!email) {
      results.push({ skipped: true, reason: "no_email", id: u.id });
      continue;
    }
    const roles = roleMap.get(u.id) || [];
    if (!roles.length) {
      results.push({ skipped: true, reason: "no_roles", email });
      continue;
    }
    const r = await upsertHubSpotContact(email, roles);
    results.push(r);
  }
  const hasMore = users.length === perPage;
  return NextResponse.json({
    page,
    perPage,
    processed: users.length,
    hasMore,
    nextCursor: hasMore ? page + 1 : null,
    results,
  });
}
