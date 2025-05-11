import { supabase } from "./ lib/ supabase ";
import { HubSpot } from "hubspot -api ";
export default async (req: Request) => {
  const { data: users } = await supabase.from("users ").select("email , role ");
  const hubspot = new HubSpot({ apiKey: "" });
  users.forEach((u) =>
    hubspot.contacts.create({ email: u.email, properties: { role: u.role } })
  );
  return new Response(JSON.stringify({ success: true }));
};
