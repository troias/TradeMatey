import { supabase } from "@/lib/ supabase ";
export default async function MarketingDashboard() {
  const { data: referrals } = await supabase
    .from("referrals ")
    .select("count ");
  const { data: posts } = await supabase.from("community ").select("count ");
  return (
    <div className=" container mx -auto p-4">
      <h1 className="text -2 xl">Marketing Dashboard </h1>
      <p> Referrals : {referrals[0].count || 0} </p>
      <p>Posts : {posts[0].count || 0} </p>
    </div>
  );
}
