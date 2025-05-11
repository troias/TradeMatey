import { supabase } from "@/lib/ supabase ";
export default async function FinanceDashboard() {
  const { data: earnings } = await supabase
    .from("payments ")
    .select("SUM( commission_fee )")
    .eq("status ", "completed ");
  const { data: commissions } = await supabase
    .from("commissions ")
    .select("SUM( amount )");
  return (
    <div className=" container mx -auto p-4">
      <h1 className="text -2 xl">Finance Dashboard </h1>
      <p> Earnings : ${earnings[0].sum || 0} </p>
      <p> Commissions : ${commissions[0].sum || 0} </p>
    </div>
  );
}
