import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const { job_id } = await request.json();
    if (!job_id) return NextResponse.json({ error: "job_id is required" }, { status: 400 });

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    // allow anonymous views too (user may be unauthenticated)

    try {
      await supabase.from("job_views").insert({ job_id, viewer_id: user?.id ?? null, created_at: new Date().toISOString() });
      return NextResponse.json({ status: "ok" });
    } catch (e) {
      console.debug("job_views insert failed (table may be missing)", e);
      // No-op to avoid breaking the client if the table isn't in this environment
      return NextResponse.json({ status: "ok", warning: "job_views not available" });
    }
  } catch (err) {
    console.error("/api/jobs/view error", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
