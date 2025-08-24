import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL || "";
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("missing supabase envs");
  process.exit(1);
}
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function run(userId: string) {
  const { error } = await supabase
    .from("hubspot_sync_queue")
    .insert([{ user_id: userId, next_run_at: new Date().toISOString() }]);
  if (error) {
    console.error(error);
    process.exit(1);
  }
  console.log("enqueued", userId);
}

const uid = process.argv[2];
if (!uid) {
  console.error("usage: node dist/scripts/enqueue_test_user.js <userId>");
  process.exit(1);
}
run(uid).catch((e) => {
  console.error(e);
  process.exit(1);
});
