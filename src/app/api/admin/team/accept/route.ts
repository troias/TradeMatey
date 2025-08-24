import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";

export async function POST(req: Request) {
  const body = await req.json();
  const { token, email } = body;
  if (!token || !email)
    return NextResponse.json({ error: "missing" }, { status: 400 });
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("invitations")
    .select("*")
    .eq("token", token)
    .single();
  if (error || !data)
    return NextResponse.json({ error: "invalid token" }, { status: 400 });
  if (data.status !== "pending")
    return NextResponse.json({ error: "not_pending" }, { status: 400 });

  // In a real flow we'd create a user record and profile; here we mark accepted
  const { error: updErr } = await supabase
    .from("invitations")
    .update({ status: "accepted", accepted_at: new Date().toISOString() })
    .eq("id", data.id);
  if (updErr)
    return NextResponse.json({ error: updErr.message }, { status: 500 });

  // Find user by email. If not found, create a minimal user and profile, then grant role via role_bindings.
  const { data: userRow, error: userErr } = await supabase
    .from("users")
    .select("id")
    .eq("email", email)
    .single();
  let userId: string | null = null;
  if (userErr || !userRow) {
    // create minimal user record (service role required to set secure fields)
    const id = crypto.randomUUID();
    const { error: insErr } = await supabase
      .from("users")
      .insert([{ id, email, created_at: new Date().toISOString() }]);
    if (insErr)
      return NextResponse.json({ error: insErr.message }, { status: 500 });
    // create basic profile row
    await supabase
      .from("profiles")
      .insert([
        {
          id,
          role: data.role || "employee",
          created_at: new Date().toISOString(),
        },
      ]);
    userId = id;
  } else {
    // userRow is a record with { id }
    const userRec: { id: string } = userRow as unknown as { id: string };
    userId = userRec.id;
  }

  // Insert role_binding directly (service-role) to avoid admin approval flow here
  const { error: rbErr } = await supabase.from("role_bindings").insert([
    {
      user_id: userId,
      role: data.role,
      created_at: new Date().toISOString(),
    },
  ]);
  if (rbErr)
    return NextResponse.json({ error: rbErr.message }, { status: 500 });

  return NextResponse.json({ status: "accepted", user_id: userId });
}
