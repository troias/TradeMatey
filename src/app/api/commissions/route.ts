import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Get commissions for current user derived from payments.commission_fee
export async function GET() {
  const supabase = createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("payments")
    .select("id, job_id, commission_fee, created_at")
    .eq("client_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Shape to what the dashboard expects: amount, source_type, source_id
  const shaped = (data || []).map((p) => ({
    id: p.id,
    amount: p.commission_fee || 0,
    source_type: "job",
    source_id: p.job_id,
    created_at: p.created_at,
  }));

  return NextResponse.json(shaped);
}
