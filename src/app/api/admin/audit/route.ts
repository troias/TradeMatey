import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("audit_log")
    .select("table_name,action,created_at")
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) return NextResponse.json([], { status: 500 });
  return NextResponse.json(data || []);
}
