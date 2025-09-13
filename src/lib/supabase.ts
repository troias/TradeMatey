import { createClient } from "@supabase/supabase-js";

let _supabase: ReturnType<typeof createClient> | null = null;

export function getSupabase() {
  if (!_supabase) {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      throw new Error("Supabase not configured: NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY must be set");
    }
    _supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  }
  return _supabase;
}

// Backwards-compatible export for modules that import `supabase` directly.
// Provide a lazy proxy so existing imports using `supabase` continue to work
/* eslint-disable @typescript-eslint/no-explicit-any */
export const supabase = new Proxy({}, {
  get(_, prop) {
    const client: any = getSupabase();
    return client[prop];
  },
  apply(_, thisArg, args) {
    const client: any = getSupabase();
    return client.apply(thisArg, args);
  },
}) as unknown as ReturnType<typeof createClient>;
/* eslint-enable @typescript-eslint/no-explicit-any */
