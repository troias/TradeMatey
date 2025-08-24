import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import crypto from "crypto";

// Create a short-lived, single-use signed link for /admin/dashboard
export async function POST() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Check admin role
  const { data: roles } = await supabase
    .from("user_roles_if_migrated")
    .select("role")
    .eq("user_id", user.id);
  const isAdmin = (roles || []).some(
    (r: { role: string }) => r.role === "admin"
  );
  if (!isAdmin)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const token = crypto.randomBytes(24).toString("hex");
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();

  // Store token for single use
  await supabase.from("admin_links").insert({
    user_id: user.id,
    token,
    expires_at: expiresAt,
    used: false,
  });

  const base = process.env.NEXT_PUBLIC_APP_URL || "";
  const url = `${base}/admin/dashboard?token=${token}`;
  return NextResponse.json({ url });
}
