import { NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { token } = await request.json().catch(() => ({ token: "" }));
  if (!token)
    return NextResponse.json({ error: "Missing token" }, { status: 400 });

  // Fetch invite bound to the caller's email
  const { data: invite } = await supabase
    .from("admin_invites")
    .select("id, invited_email, expires_at, used")
    .eq("token", token)
    .maybeSingle();

  if (!invite)
    return NextResponse.json({ error: "Invalid invite" }, { status: 404 });
  if (invite.used)
    return NextResponse.json({ error: "Invite already used" }, { status: 400 });
  if (invite.expires_at && new Date(invite.expires_at) < new Date()) {
    return NextResponse.json({ error: "Invite expired" }, { status: 400 });
  }

  // Ensure invite matches the current user's email
  const { data: profile } = await supabase
    .from("users")
    .select("email")
    .eq("id", user.id)
    .maybeSingle();
  const email = profile?.email || user.email; // fallback to auth email if available
  if (!email || email.toLowerCase() !== invite.invited_email.toLowerCase()) {
    return NextResponse.json(
      { error: "Invite is not for this account" },
      { status: 403 }
    );
  }

  // Grant admin role if not already present
  const { data: roles } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id);
  const hasAdmin = (roles || []).some(
    (r: { role: string }) => r.role === "admin"
  );
  if (!hasAdmin) {
    const { error: roleErr } = await supabase
      .from("user_roles")
      .insert({ user_id: user.id, role: "admin" });
    if (roleErr)
      return NextResponse.json(
        { error: "Failed to grant admin" },
        { status: 500 }
      );
  }

  // Mark invite used
  await supabase
    .from("admin_invites")
    .update({
      used: true,
      accepted_by: user.id,
      accepted_at: new Date().toISOString(),
    })
    .eq("id", invite.id);

  return NextResponse.json({ ok: true });
}
