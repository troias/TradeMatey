import { createClient } from "@/lib/supabase/server";
import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    // Hide admin area; don’t reveal existence
    redirect("/");
  }

  const { data: roles } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id);
  const isAdmin = (roles || []).some(
    (r: { role: string }) => r.role === "admin"
  );
  if (!isAdmin) {
    notFound();
  }

  // Best-effort audit log; ignore errors
  try {
    await supabase.from("analytics").insert({
      user_id: user.id,
      event_type: "admin_page_view",
      metadata: { path: "/admin" },
    });
  } catch {}

  return <>{children}</>;
}
