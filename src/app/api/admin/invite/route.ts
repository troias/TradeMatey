import { NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";
import crypto from "crypto";

export async function POST(request: Request) {
  const supabase = createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Ensure caller is admin
  const { data: roles } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id);
  const isAdmin = (roles || []).some(
    (r: { role: string }) => r.role === "admin"
  );
  if (!isAdmin)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await request.json().catch(() => ({}));
  const email = (body?.email || "").toString().trim().toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return NextResponse.json({ error: "Invalid email" }, { status: 400 });
  }

  const token = crypto.randomBytes(24).toString("hex");
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

  const { error: insertError } = await supabase.from("admin_invites").insert({
    invited_email: email,
    invited_by: user.id,
    token,
    expires_at: expiresAt,
    used: false,
  });
  if (insertError) {
    return NextResponse.json(
      { error: "Failed to create invite" },
      { status: 500 }
    );
  }

  const base = process.env.NEXT_PUBLIC_APP_URL || "";
  const url = `${base}/admin/accept?token=${token}`;
  return NextResponse.json({ url });
}

export async function GET(request: Request) {
  const supabase = createServerClient();
  const url = new URL(request.url);
  const status = url.searchParams.get('status');
  let query = supabase.from('admin_invites').select('token, invited_email, used, expires_at, status, invited_by');
  if (status) query = query.eq('status', status);
  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  // normalize field names for client
  const mapped = (data || []).map((r: unknown) => {
    const row = r as Record<string, unknown>;
    return {
      token: String(row.token),
      email: row.invited_email ? String(row.invited_email) : null,
      used: Boolean(row.used),
      expires_at: row.expires_at || null,
      status: row.status || null,
    };
  });
  return NextResponse.json(mapped);
}
