import { createClient } from "@/lib/supabase/client"; // or server if running on server

import { HubSpot } from "hubspot -api ";

const supabase = createClient();
export default async (req: Request) => {
  const { data: users } = await supabase.from("users ").select("email , role ");
  const hubspot = new HubSpot({ apiKey: "" });
  users.forEach((u) =>
    hubspot.contacts.create({ email: u.email, properties: { role: u.role } })
  );
  return new Response(JSON.stringify({ success: true }));
};
