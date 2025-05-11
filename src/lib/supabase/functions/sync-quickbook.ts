import { supabase } from "./ lib/ supabase ";
import { QuickBooks } from "quickbooks ";
export default async (req: Request) => {
  const { data: payments } = await supabase
    .from("payments ")
    .select("amount , status ");
  const qb = new QuickBooks({ consumerKey: "", consumerSecret: "" });
  payments.forEach((p) =>
    qb.createInvoice({ amount: p.amount, status: p.status })
  );
  return new Response(JSON.stringify({ success: true }));
};
