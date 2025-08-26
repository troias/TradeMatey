import { createServiceClient } from "@/lib/supabase/service";
import { randomUUID } from "crypto";

type MinimalFrom = {
  insert: (row: Record<string, unknown>) => Promise<{ error: unknown }>,
  update?: (row: Record<string, unknown>) => { eq: (col: string, val: unknown) => Promise<{ error: unknown }> },
};

type MinimalSupabase = {
  from: (table: string) => MinimalFrom;
};

export async function createInviteForEmail(email: string, supabaseClient?: MinimalSupabase) {
  const supabase = (supabaseClient ?? createServiceClient()) as MinimalSupabase;
  const token = `invite-${randomUUID()}`;
  const { error } = await supabase.from("admin_invites").insert({ token, email, used: false });
  if (error) throw new Error("failed_to_insert");
  return token;
}

export async function markInviteUsedToken(token: string, supabaseClient?: MinimalSupabase) {
  const supabase = (supabaseClient ?? createServiceClient()) as MinimalSupabase;
  const updater = supabase.from("admin_invites");
  if (!updater.update) throw new Error("supabase_client_missing_update");
  const { error } = await updater.update({ used: true }).eq("token", token);
  if (error) throw new Error("failed_to_update");
  return true;
}
