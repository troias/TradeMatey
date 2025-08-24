// HubSpot helper functions for contact upsert/backfill
// Assumes a custom multi-select property `app_roles` exists in HubSpot.

export interface HubSpotContactUpsertResult {
  created?: boolean;
  updated?: boolean;
  id?: string;
  skipped?: boolean;
  reason?: string;
  email?: string;
}

async function findExistingByEmail(email: string, token: string) {
  const res = await fetch(
    "https://api.hubapi.com/crm/v3/objects/contacts/search",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        filterGroups: [
          {
            filters: [{ propertyName: "email", operator: "EQ", value: email }],
          },
        ],
        properties: ["email"],
        limit: 1,
      }),
    }
  );
  if (!res.ok) return null;
  const json = await res.json();
  return json?.results?.[0] || null;
}

export async function upsertHubSpotContact(
  email: string,
  roles: string[]
): Promise<HubSpotContactUpsertResult> {
  const token = process.env.HUBSPOT_TOKEN;
  if (!token) return { skipped: true, reason: "missing_token", email };
  if (!email) return { skipped: true, reason: "missing_email", email };
  try {
    // Only send primary app roles (client/tradie). If none present, fall back to all roles.
    const primary = roles.filter((r) => r === "client" || r === "tradie");
    if (primary.length === 0) {
      return { skipped: true, reason: "no_primary_roles", email };
    }
    const uniqueRoles = Array.from(new Set(primary)).sort();
    const existing = await findExistingByEmail(email, token);
    const properties = { email, app_roles: uniqueRoles.join(";") };
    if (existing) {
      const patch = await fetch(
        `https://api.hubapi.com/crm/v3/objects/contacts/${existing.id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ properties }),
        }
      );
      if (!patch.ok) {
        const detail = await patch.text().catch(() => "");
        console.error("[hubspot-patch-failed]", patch.status, detail);
        return {
          updated: false,
          id: existing.id,
          email,
          skipped: true,
          reason: "patch_failed",
        };
      }
      return { updated: true, id: existing.id, email };
    }
    const createRes = await fetch(
      "https://api.hubapi.com/crm/v3/objects/contacts",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ properties }),
      }
    );
    if (!createRes.ok) {
      const detail = await createRes.text().catch(() => "");
      console.error("[hubspot-create-failed]", createRes.status, detail);
      return { skipped: true, reason: "create_failed", email };
    }
    const created = await createRes.json();
    return { created: true, id: created.id, email };
  } catch (e) {
    console.error("[hubspot-upsert-error]", e);
    return { skipped: true, reason: "exception", email };
  }
}
