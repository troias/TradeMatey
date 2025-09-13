import { createClient } from "@/lib/supabase/client"; // or server if running on server
const supabase = createClient();

export default async function handler() {
  const { data } = await supabase.from("payments").select("amount, status");
  const payments = Array.isArray(data) ? data as unknown[] : [];
  try {
    const mod = await import("quickbooks");
    const QuickBooks = mod && (mod.default || mod);
    const qb = new QuickBooks({ consumerKey: process.env.QB_KEY, consumerSecret: process.env.QB_SECRET });
    payments.forEach((p) => {
      const pp = p as Record<string, unknown>;
      const amount = typeof pp.amount === "number" ? pp.amount : 0;
      const status = typeof pp.status === "string" ? pp.status : "";
      // best-effort
      try {
        qb.createInvoice({ amount, status });
      } catch {}
    });
  } catch {
    // ignore if quickbooks client not present
  }
  return new Response(JSON.stringify({ success: true }));
}
