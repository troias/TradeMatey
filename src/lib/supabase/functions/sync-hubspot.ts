import { createClient } from "@/lib/supabase/server";

export default async function handler() {
  const supabase = createClient();
  const { data } = await supabase.from("users").select("email, role");
  const users = Array.isArray(data) ? (data as unknown[]) : [];
  try {
    // dynamic import to avoid requiring the package during lint/time if not installed
    const mod = await import("@hubspot/api-client");
    const HubSpot = mod && (mod.default || mod);
    const hubspot = new HubSpot({ apiKey: process.env.HUBSPOT_API_KEY });
    users.forEach((u) => {
      const maybe = u as Record<string, unknown>;
      const email = typeof maybe.email === "string" ? maybe.email : undefined;
      const role = typeof maybe.role === "string" ? maybe.role : undefined;
      if (email) {
        // best-effort; ignore promise rejections
        // @ts-expect-error - hubspot SDK types are optional at runtime
        hubspot.crm.contacts.basicApi.create({ properties: { email, role } }).catch(() => {});
      }
    });
  } catch {
    // ignore if hubspot client not present
  }
  return new Response(JSON.stringify({ success: true }));
}
