import { createClient } from "@supabase/supabase-js";
import { createHash, randomBytes, createCipheriv } from "crypto";

const SUPABASE_URL = process.env.SUPABASE_URL || "";
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const APP_KEY = process.env.APP_TOKEN_KEY || process.env.HUBSPOT_APP_KEY || "";

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("missing supabase envs");
  process.exit(1);
}
if (!APP_KEY) {
  console.error("missing APP_KEY");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

function deriveKey(keyStr: string) {
  return createHash("sha256").update(keyStr).digest();
}
function encrypt(text: string, keyStr: string) {
  const key = deriveKey(keyStr);
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([
    cipher.update(text, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, encrypted]).toString("base64");
}

async function run() {
  const { data: portals } = await supabase
    .from("hubspot_portals")
    .select("id, access_token, refresh_token");
  if (!portals) {
    console.log("no portals");
    return;
  }
  for (const p of portals) {
    if (p.access_token) {
      const enc = encrypt(p.access_token, APP_KEY);
      await supabase
        .from("hubspot_portals")
        .update({ encrypted_access_token: enc })
        .eq("id", p.id);
      console.log("encrypted access token for", p.id);
    }
    if (p.refresh_token) {
      const enc = encrypt(p.refresh_token, APP_KEY);
      await supabase
        .from("hubspot_portals")
        .update({ encrypted_refresh_token: enc })
        .eq("id", p.id);
      console.log("encrypted refresh token for", p.id);
    }
  }
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
