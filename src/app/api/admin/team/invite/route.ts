import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";

export async function POST(req: Request) {
  const body = await req.json();
  const { email, role } = body;
  if (!email || !role)
    return NextResponse.json({ error: "missing" }, { status: 400 });
  const supabase = createServerClient();
  const token = crypto.randomUUID();
  const { error } = await supabase
    .from("invitations")
    .insert([{ email, role, token, invited_by: null }]);
  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ status: "ok", token });
}
