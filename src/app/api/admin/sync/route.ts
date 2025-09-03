import { NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

export async function POST() {
  const supabase = createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const hsToken = process.env.HUBSPOT_TOKEN;
  if (!hsToken)
    return NextResponse.json(
      { error: "Missing HUBSPOT_TOKEN" },
      { status: 500 }
    );

  // Find HubSpot contact by email
  const searchBody = {
    filterGroups: [
      {
        filters: [
          {
            propertyName: "email",
            operator: "EQ",
            value: user.email.toLowerCase(),
          },
        ],
      },
    ],
    properties: [
      "app_roles",
      "is_admin",
      "is_client",
      "is_tradie",
      "is_marketing",
      "is_finance",
      "is_support",
      "is_employee",
    ],
    limit: 1,
  };

  const resp = await fetch(
    "https://api.hubapi.com/crm/v3/objects/contacts/search",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${hsToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(searchBody),
      cache: "no-store",
    }
  );

  if (!resp.ok) {
    const text = await resp.text();
    return NextResponse.json(
      { error: "HubSpot error", details: text },
      { status: 502 }
    );
  }
  type HSContact = {
    properties?: {
      app_roles?: string;
  remove_admin?: string | boolean;
      is_admin?: string | boolean;
      is_client?: string | boolean;
      is_tradie?: string | boolean;
      is_marketing?: string | boolean;
      is_finance?: string | boolean;
      is_support?: string | boolean;
      is_employee?: string | boolean;
    };
  };
  type HSSearch = { results?: HSContact[] };
  const payload: HSSearch = await resp.json();
  const contact = payload?.results?.[0];
  const allowedRoles = new Set([
    "client",
    "tradie",
    "admin",
    "marketing",
    "finance",
    "support",
    "employee",
    // enterprise/"million dollar app" roles
    "operations",
    "compliance",
    "risk",
    "product",
    "engineering",
    "analyst",
    "auditor",
    "finance_manager",
    "support_manager",
    "marketing_manager",
  ]);
  const rawRoles = (contact?.properties?.app_roles || "") as string;
  const multiRoles = rawRoles
    .split(";")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
  const rolesFromBooleans = [
    contact?.properties?.is_client ? "client" : null,
    contact?.properties?.is_tradie ? "tradie" : null,
    contact?.properties?.is_marketing ? "marketing" : null,
    contact?.properties?.is_finance ? "finance" : null,
    contact?.properties?.is_support ? "support" : null,
    contact?.properties?.is_employee ? "employee" : null,
    contact?.properties?.is_admin ? "admin" : null,
  ].filter((r): r is string => !!r);
  const desiredRoles = new Set<string>();
  [...multiRoles, ...rolesFromBooleans].forEach((r) => {
    if (allowedRoles.has(r)) desiredRoles.add(r);
  });

  // Apply to DB using service role
  const svc = createServiceClient();
  // Current roles for this user
  const { data: current } = await svc
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id);
  const currentSet = new Set(
    (current || []).map((r: { role: string }) => r.role)
  );
  const toAdd = [...desiredRoles].filter((r) => !currentSet.has(r));
  const toRemove = [...currentSet].filter(
    (r) => !desiredRoles.has(r) && allowedRoles.has(r)
  );

  // Admin uniqueness: attempt admin first
  if (toAdd.includes("admin")) {
    const { error: addAdminErr } = await svc
      .from("user_roles")
      .upsert(
        { user_id: user.id, role: "admin" },
        { onConflict: "user_id,role", ignoreDuplicates: true }
      );
    if (addAdminErr) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Another admin already exists. Toggle off admin in CRM for them first.",
        },
        { status: 409 }
      );
    }
  }

  // IMPORTANT: Do NOT remove admin automatically based on CRM data unless the
  // CRM contact explicitly requests removal. This prevents accidental privilege
  // loss when external data is incomplete. To remove admin via CRM, set the
  // contact property `remove_admin` = 'true'. Only then will the admin role be removed.
  const crmWantsRemoveAdmin = (contact?.properties?.remove_admin || "") === "true";
  if (currentSet.has("admin") && !desiredRoles.has("admin") && crmWantsRemoveAdmin) {
    await svc
      .from("user_roles")
      .delete()
      .eq("user_id", user.id)
      .eq("role", "admin");
    // record audit of CRM-initiated admin removal
    try {
      await svc.from("admin_audit").insert({
        action: 'crm_remove_admin',
        user_id: user.id,
        actor: user.id,
        metadata: { source: 'hubspot', contact_email: user.email }
      });
    } catch (e) {
      // ignore audit failures but log to server console
      console.warn('Failed to write admin_audit for CRM removal', e);
    }
  }

  const bulkAdd = toAdd
    .filter((r) => r !== "admin")
    .map((r) => ({ user_id: user.id, role: r }));
  if (bulkAdd.length) {
    await svc
      .from("user_roles")
      .upsert(bulkAdd, { onConflict: "user_id,role", ignoreDuplicates: true });
  }

  const nonAdminRemovals = toRemove.filter((r) => r !== "admin");
  if (nonAdminRemovals.length) {
    await svc
      .from("user_roles")
      .delete()
      .eq("user_id", user.id)
      .in("role", nonAdminRemovals);
  }

  return NextResponse.json({ ok: true, roles: [...desiredRoles] });
}
