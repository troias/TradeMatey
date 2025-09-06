import { createClient } from "@supabase/supabase-js";
import {
  randomBytes,
  createCipheriv,
  createDecipheriv,
  createHash,
} from "crypto";

// Robust HubSpot worker: token refresh, retry/backoff, DLQ, concurrency metrics
const SUPABASE_URL =
  process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
// Support private HubSpot apps via a static access token or OAuth (if CLIENT_ID/SECRET provided)
const HUBSPOT_ACCESS_TOKEN =
  process.env.HUBSPOT_ACCESS_TOKEN ||
  process.env.HUBSPOT_PRIVATE_ACCESS_TOKEN ||
  process.env.HUBSPOT_TOKEN ||
  process.env.HUBSPOT_PAT ||
  process.env.HUBSPOT_PAT_TOKEN ||
  "";
export const USE_OAUTH = Boolean(
  process.env.HUBSPOT_CLIENT_ID && process.env.HUBSPOT_CLIENT_SECRET
);

if (!SUPABASE_URL || !SUPABASE_KEY) {
  throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const MAX_ATTEMPTS = 5;
export const metrics = {
  processed: 0,
  syncs: 0,
  errors: 0,
  dlq: 0,
  reset() {
    this.processed = 0;
    this.syncs = 0;
    this.errors = 0;
    this.dlq = 0;
  }
};

// AES-256-GCM helpers (use a KMS or secure secret in production)
export function deriveKey(keyStr: string) {
  return createHash("sha256").update(keyStr).digest(); // 32 bytes
}

export function encrypt(text: string, keyStr: string) {
  const key = deriveKey(keyStr);
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([
    cipher.update(text, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  // store iv(12) + tag(16) + ciphertext
  return Buffer.concat([iv, tag, encrypted]).toString("base64");
}

export function decrypt(enc: string, keyStr: string): string | null {
  if (!enc) return null;
  try {
    const data = Buffer.from(enc, "base64");
    const iv = data.slice(0, 12);
    const tag = data.slice(12, 28);
    const ciphertext = data.slice(28);
    const key = deriveKey(keyStr);
    const decipher = createDecipheriv("aes-256-gcm", key, iv);
    decipher.setAuthTag(tag);
    const out = Buffer.concat([
      decipher.update(ciphertext),
      decipher.final(),
    ]).toString("utf8");
    return out;
  } catch (e) {
    console.warn("decrypt failed", e instanceof Error ? e.message : String(e));
    return null;
  }
}

type PortalRow = {
  id?: string;
  portal_id?: string;
  access_token?: string;
  refresh_token?: string;
  expires_at?: string;
  encrypted_access_token?: string | null;
  encrypted_refresh_token?: string | null;
};

async function refreshTokenIfNeeded(portal: PortalRow) {
  if (!portal || typeof portal !== "object") return portal;
  // If we don't have OAuth client credentials, assume private app mode and skip refresh
  if (!USE_OAUTH) return portal;
  // prefer encrypted tokens if present
  const APP_KEY =
    process.env.APP_TOKEN_KEY || process.env.HUBSPOT_APP_KEY || "";
  const refreshToken = portal.encrypted_refresh_token
    ? decrypt(portal.encrypted_refresh_token, APP_KEY)
    : portal.refresh_token;
  const expiresAt = portal.expires_at;
  if (!refreshToken) return portal;
  if (!expiresAt) return portal;
  const expires = new Date(expiresAt);
  if (expires > new Date()) return portal; // still valid

  try {
    const clientId = process.env.HUBSPOT_CLIENT_ID!;
    const clientSecret = process.env.HUBSPOT_CLIENT_SECRET!;
    const res = await fetch("https://api.hubapi.com/oauth/v1/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken || "",
      }),
    });
    const j = await res.json();
    if (j.access_token) {
      const expiresAt = new Date(
        Date.now() + (j.expires_in || 0) * 1000
      ).toISOString();
      const updated = {
        access_token: j.access_token,
        refresh_token: j.refresh_token ?? refreshToken,
        expires_at: expiresAt,
        updated_at: new Date().toISOString(),
        encrypted_access_token: APP_KEY
          ? encrypt(j.access_token, APP_KEY)
          : null,
        encrypted_refresh_token: APP_KEY
          ? encrypt(j.refresh_token ?? refreshToken, APP_KEY)
          : null,
      };
      // store encrypted tokens and keep plaintext for compatibility (optional)
      await supabase
        .from("hubspot_portals")
        .update(updated)
        .eq("id", portal.id);
      await supabase.from("hubspot_token_audit").insert([
        {
          portal_id: portal.id,
          access_token: j.access_token,
          refresh_token: j.refresh_token ?? refreshToken,
          expires_at: expiresAt,
        },
      ]);
      // assign back to portal-like object for caller (use decrypted values)
      portal.access_token = j.access_token;
      portal.refresh_token = j.refresh_token ?? refreshToken;
      portal.expires_at = expiresAt;
    }
  } catch (e) {
    console.error("token refresh error", e);
  }
  return portal;
}

export async function lockAndProcess(limit = 10) {
  try {
    const { data, error } = await supabase.rpc("lock_hubspot_sync_queue", {
      p_limit: limit,
    });
    if (error) {
      console.error("lock error", error);
      metrics.errors++;
      return;
    }
    if (!data || !Array.isArray(data) || data.length === 0) return;

    for (const row of data) {
      metrics.processed++; // Count each row we process
      try {
        const userId = row.user_id;
        // skip if next_run_at is in future
        if (row.next_run_at && new Date(row.next_run_at) > new Date()) {
          metrics.processed--; // Don't count skipped rows
          continue;
        }

        const { data: user, error: uErr } = await supabase
          .from("users")
          .select("id, email, roles")
          .eq("id", userId)
          .single();
        if (uErr) {
          console.error(`Failed to fetch user ${userId}:`, uErr);
          metrics.errors++;
          continue;
        }
        if (!user) {
          console.error(`User ${userId} not found`);
          metrics.errors++;
          continue;
        }

        // pick the first portal for sync; later we should map per-tenant
        const { data: portals, error: pErr } = await supabase
          .from("hubspot_portals")
          .select("*")
          .limit(1);
        if (pErr) {
          console.error("Failed to fetch portal:", pErr);
          metrics.errors++;
          continue;
        }
        if (!portals || portals.length === 0) {
          console.error("No HubSpot portal configured");
          metrics.errors++;
          continue;
        }
        const portal = portals[0];

        // refresh tokens if needed, and hydrate encrypted values
        try {
          await refreshTokenIfNeeded(portal);
        } catch (refreshError) {
          console.error("Token refresh failed:", refreshError);
          metrics.errors++;
          continue;
        }

        // attempt sync
        let attempt = row.attempts || 0;
        try {
          // Implement actual HubSpot API call using portal.access_token
          const contactRes = await upsertContact(
            portal,
            String(user.email),
            (user.roles || []) as string[]
          );
          console.log(`HubSpot response:`, contactRes?.status || "ok");
          metrics.syncs++; // Increment successful syncs

          // remove queue entry (processed)
          const { error: delError } = await supabase
            .from("hubspot_sync_queue")
            .delete()
            .eq("id", row.id);
          
          if (delError) {
            console.error("Failed to delete queue entry:", delError);
            metrics.errors++;
          }

          // record metrics
          const { error: metricErr } = await supabase.rpc(
            "upsert_hubspot_worker_metric",
            {
              p_portal_id: portal.portal_id,
              p_processed: 1,
              p_errors: 0,
              p_dlq: 0,
            }
          );
          if (metricErr) {
            console.warn("metric upsert error:", metricErr.message);
            metrics.errors++;
          }
        } catch (e) {
          attempt++;
          console.error("sync error", e);
          metrics.errors++;
          
          if (attempt >= MAX_ATTEMPTS) {
            metrics.dlq++;
            const { error: dlqError } = await supabase.from("hubspot_dlq").insert([
              {
                queue_id: row.id,
                user_id: userId,
                error: String(e),
                attempts: attempt,
                payload: row,
              },
            ]);
            
            if (dlqError) {
              console.error("Failed to insert into DLQ:", dlqError);
              metrics.errors++;
            }

            // inc dlq metric
            const { error: metricErr2 } = await supabase.rpc(
              "upsert_hubspot_worker_metric",
              {
                p_portal_id: portal.portal_id,
                p_processed: 0,
                p_errors: 0,
                p_dlq: 1,
              }
            );
            if (metricErr2) {
              console.warn("metric upsert error:", metricErr2.message);
              metrics.errors++;
            }

            // Delete from queue after moving to DLQ
            const { error: delError } = await supabase
              .from("hubspot_sync_queue")
              .delete()
              .eq("id", row.id);
            
            if (delError) {
              console.error("Failed to delete queue entry:", delError);
              metrics.errors++;
            }
          } else {
            // Implement exponential backoff
            const backoffMs = Math.min(60_000, 1000 * 2 ** attempt);
            const nextRun = new Date(Date.now() + backoffMs).toISOString();
            const { error: updateError } = await supabase
              .from("hubspot_sync_queue")
              .update({
                attempts: attempt,
                last_error: String(e),
                next_run_at: nextRun,
              })
              .eq("id", row.id);
            
            if (updateError) {
              console.error("Failed to update queue entry:", updateError);
              metrics.errors++;
            }
          }
        }
      } catch (err) {
        console.error("processing error", err);
        metrics.errors++;
      }
    }
  } catch (e) {
    console.error("lockAndProcess error:", e);
    metrics.errors++;
  }
}

async function upsertContact(
  portal: PortalRow,
  email: string,
  roles: string[]
) {
  // resolve token order:
  // 1) portal.encrypted_access_token (decrypted)
  // 2) portal.access_token
  // 3) HUBSPOT_ACCESS_TOKEN (env for private apps)
  let token = portal.access_token;
  const APP_KEY =
    process.env.APP_TOKEN_KEY || process.env.HUBSPOT_APP_KEY || "";
  if (portal.encrypted_access_token && APP_KEY) {
    const dec = decrypt(portal.encrypted_access_token as string, APP_KEY);
    token = dec ?? token;
  }
  if ((!token || token.length === 0) && HUBSPOT_ACCESS_TOKEN)
    token = HUBSPOT_ACCESS_TOKEN;
  if (!portal || !token) throw new Error("missing portal token");
  const base = "https://api.hubapi.com";
  const headers = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };

  // search by email
  const searchBody = {
    filterGroups: [
      { filters: [{ propertyName: "email", operator: "EQ", value: email }] },
    ],
    properties: ["email"],
  };

  let res = await fetch(`${base}/crm/v3/objects/contacts/search`, {
    method: "POST",
    headers,
    body: JSON.stringify(searchBody),
  });
  if (res.status === 401) {
    if (USE_OAUTH) {
      // try token refresh once
      await refreshTokenIfNeeded(portal);
      // re-resolve token after refresh
      let retryToken = portal.access_token;
      if (portal.encrypted_access_token && APP_KEY) {
        const d = decrypt(portal.encrypted_access_token as string, APP_KEY);
        retryToken = d ?? retryToken;
      }
      if (!retryToken && HUBSPOT_ACCESS_TOKEN)
        retryToken = HUBSPOT_ACCESS_TOKEN;
      res = await fetch(`${base}/crm/v3/objects/contacts/search`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${retryToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(searchBody),
      });
    } else {
      // private app mode: 401 means the static token is invalid
      throw new Error("unauthorized: check HUBSPOT_ACCESS_TOKEN");
    }
  }

  if (res.status === 429) {
    const ra = res.headers.get("Retry-After");
    const wait = ra ? Number(ra) * 1000 : 1000;
    await new Promise((r) => setTimeout(r, wait));
    res = await fetch(`${base}/crm/v3/objects/contacts/search`, {
      method: "POST",
      headers,
      body: JSON.stringify(searchBody),
    });
  }

  const j = await res.json().catch(() => null);
  const found =
    j && Array.isArray(j.results) && j.results.length > 0 ? j.results[0] : null;

  const props: Record<string, unknown> = { email };
  if (roles && roles.length) props["app_roles"] = roles; // assumes multi-select property 'app_roles' exists

  // apply portal-specific property mappings if present
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: settings, error: sErr } = await (supabase as any)
      .from("hubspot_portal_settings")
      .select("property_mappings")
      .eq("portal_id", portal.portal_id)
      .single();
    if (!sErr && settings && settings.property_mappings) {
      const map = settings.property_mappings as Record<string, string>;
      if (map["roles_property"]) {
        props[map["roles_property"]] = roles;
        delete props["app_roles"];
      }
    }
  } catch (err) {
    console.warn(
      "mapping lookup failed",
      err instanceof Error ? err.message : String(err)
    );
  }

  if (!found) {
    // create
    const createRes = await fetch(`${base}/crm/v3/objects/contacts`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ properties: props }),
    });
    if (createRes.status >= 400)
      throw new Error(`create failed ${createRes.status}`);
    return { status: "created" };
  } else {
    // update
    const id = found.id;
    const updateRes = await fetch(`${base}/crm/v3/objects/contacts/${id}`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ properties: props }),
    });
    if (updateRes.status >= 400)
      throw new Error(`update failed ${updateRes.status}`);
    return { status: "updated" };
  }
}

async function main() {
  console.log("HubSpot worker started");
  while (true) {
    try {
      await lockAndProcess(10);
      // emit simple metrics
      console.log("metrics", metrics);
    } catch (e) {
      console.error(e);
    }
    await new Promise((r) => setTimeout(r, 5000));
  }
}

// Exported starter for programmatic control in tests or runtime.
export async function startWorker() {
  return main();
}

// Avoid starting the background loop when running inside Jest or NODE_ENV=test.
// Tests can import and call `lockAndProcess` or `startWorker` explicitly.
if (!process.env.JEST_WORKER_ID && process.env.NODE_ENV !== "test") {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
