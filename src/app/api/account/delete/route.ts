import { NextResponse } from "next/server";
import { createClient as createServerSupabase } from "@/lib/supabase/server";
import { createClient as createSupabaseAdmin } from "@supabase/supabase-js";

export async function POST() {
  const supabase = createServerSupabase();

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Confirm the user is a client (has a clients row)
    const { data: clientRow, error: clientErr } = await supabase
      .from("clients")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();
    if (clientErr) {
      console.error(clientErr);
      return NextResponse.json(
        { error: "Failed to verify client" },
        { status: 500 }
      );
    }
    if (!clientRow) {
      return NextResponse.json(
        { error: "Only clients can delete from client settings" },
        { status: 400 }
      );
    }

    // Check for outstanding jobs (pending/open/in_progress)
    const { count: outstandingCount, error: jobsErr } = await supabase
      .from("jobs")
      .select("id", { count: "exact", head: true })
      .eq("client_id", user.id)
      .in("status", ["pending", "open", "in_progress"]);
    if (jobsErr) {
      console.error(jobsErr);
      return NextResponse.json(
        { error: "Failed to check outstanding jobs" },
        { status: 500 }
      );
    }
    if ((outstandingCount ?? 0) > 0) {
      return NextResponse.json(
        {
          error: `You still have ${outstandingCount} outstanding job(s). Complete or cancel them before deleting your account.`,
        },
        { status: 409 }
      );
    }

    // Best-effort: remove related app rows (scoped to current user via RLS)
    const deletions = [
      supabase.from("clients").delete().eq("user_id", user.id),
      supabase.from("user_roles").delete().eq("user_id", user.id),
      supabase.from("profiles").delete().eq("id", user.id),
      supabase.from("users").delete().eq("id", user.id),
    ];
    for (const p of deletions) {
      const { error } = await p;
      if (error && error.code !== "PGRST116") {
        // PGRST116: No rows found; ignore
        console.warn("Delete related row warning:", error.message);
      }
    }

    // Delete the auth user via admin client (service role)
    const adminKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (!adminKey || !supabaseUrl) {
      console.error("Service role key or URL missing");
      return NextResponse.json(
        { error: "Server misconfiguration" },
        { status: 500 }
      );
    }
    const admin = createSupabaseAdmin(supabaseUrl, adminKey);
    const { error: delErr } = await admin.auth.admin.deleteUser(user.id);
    if (delErr) {
      console.error(delErr);
      return NextResponse.json(
        { error: "Failed to delete auth user" },
        { status: 500 }
      );
    }

    // Clear session cookies
    await supabase.auth.signOut();

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("Account deletion error:", e);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
