import { createClient } from "@/lib/supabase/server";

export default async function MarketingDashboard() {
  const supabase = createClient();
  const { data: referrals } = await supabase
    .from("referrals")
    .select("count")
    .maybeSingle();
  const { data: posts } = await supabase
    .from("community")
    .select("count")
    .maybeSingle();

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl">Marketing Dashboard</h1>
      <p>Referrals: {referrals?.count ?? 0}</p>
      <p>Posts: {posts?.count ?? 0}</p>
    </div>
  );
}
