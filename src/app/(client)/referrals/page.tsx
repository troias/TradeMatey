import { supabase } from "@/lib/supabase";
export default async function Referrals() {
  const { data: referral } = await supabase
    .from("referrals")
    .select("link")
    .single();
  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold">Refer a Friend</h1>
      <p>Share: {referral?.link}</p>
    </div>
  );
}
