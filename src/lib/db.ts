import { createClient } from "@supabase/supabase-js";

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!, // Non-null assertion to ensure the value is defined
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY! // Non-null assertion to ensure the value is defined
);
