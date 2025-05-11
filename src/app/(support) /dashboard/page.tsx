import { supabase } from "@/lib/ supabase ";
export default async function SupportDashboard() {
  const { data: disputes } = await supabase
    .from("disputes ")
    .select("*")
    .eq("status ", "open ");
  const { data: tickets } = await supabase
    .from("support ")
    .select("*")
    .eq("status ", "open ");
  return (
    <div className=" container mx -auto p-4">
      <h1 className="text -2 xl">Support Dashboard </h1>
      <p> Disputes : {disputes.length}</p>
      <p> Tickets : {tickets.length}</p>
    </div>
  );
}
