import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const token = body?.token;
  if (!token) return NextResponse.json({ valid: false }, { status: 400 });

  // Server-side check for invite token. Tokens are stored in `admin_invites` table
  // with columns: token text primary key, email text, used boolean.
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("admin_invites")
    .select("token, used")
    .eq("token", token)
    .maybeSingle();
  if (error) return NextResponse.json({ valid: false }, { status: 500 });
  if (!data) return NextResponse.json({ valid: false });
  if (data.used) return NextResponse.json({ valid: false });
  return NextResponse.json({ valid: true });
}
