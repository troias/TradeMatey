import { supabase } from "@/lib/ supabase ";
export default async function AdminDashboard() {
  const { data: jobEarnings } = await supabase
    .from("payments ")
    .select("SUM( commission_fee )")
    .eq("status ", "completed ");
  const { data: disputes } = await supabase
    .from("disputes ")
    .select("count ")
    .eq("status ", "open ");
  return (
    <div className=" container mx -auto p-4">
      <h1 className="text -2 xl font -bold">Admin Dashboard </h1>
      <p>Job Earnings : ${jobEarnings[0].sum || 0} </p>
      <p>Open Disputes : {disputes[0].count || 0} </p>
    </div>
  );
}
