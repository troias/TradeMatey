import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import util from "util";

function getMessage(e: unknown) {
  try {
    if (e instanceof Error) return e.message || String(e);

    if (e && typeof e === "object") {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const anyE = e as any;
      // Prefer common fields
      if (typeof anyE.message === "string" && anyE.message.trim()) return anyE.message;
      if (typeof anyE.msg === "string" && anyE.msg.trim()) return anyE.msg;

      // Collect enumerable own properties
      const entries: Record<string, unknown> = {};
      for (const k of Object.keys(anyE)) {
        try {
          entries[k] = anyE[k];
        } catch {
          entries[k] = String(anyE[k]);
        }
      }

      // If we found any enumerable props, return them jsonified
      if (Object.keys(entries).length > 0) {
        try {
          return JSON.stringify(entries);
        } catch {
          // fallthrough to inspect
        }
      }

      // If no enumerable props, try non-enumerable property names for diagnostics
      const allNames = Object.getOwnPropertyNames(anyE);
      if (allNames.length > 0) {
        const diag: Record<string, unknown> = {};
        for (const n of allNames) {
          try {
            diag[n] = anyE[n];
          } catch {
            diag[n] = String(anyE[n]);
          }
        }
        try {
          return JSON.stringify(diag);
        } catch {
          // fallthrough
        }
      }

      // As a last resort, return util.inspect to capture non-enumerable info
      return util.inspect(anyE, { depth: 2, breakLength: Infinity });
    }

    return String(e);
  } catch (err) {
    return "Unknown error";
  }
}

function sanitizeMessage(msg: string) {
  // Hide raw SQL/internal column names from clients while keeping logs server-side
  const postgresMissingColumn = /column\s+"?([\w_.]+)"?\s+does not exist/i;
  const m = msg.match(postgresMissingColumn);
  if (m) {
    // Log full message server-side; return a friendlier, non-technical message to client
    console.error("Detected missing DB column:", msg);
    return `Database schema mismatch or missing column; please run migrations or contact an administrator.`;
  }
  return msg;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const trade = searchParams.get("trade");
    const user_id = searchParams.get("user_id");
    const id = searchParams.get("id");

    let supabase;
    try {
      supabase = createClient();
    } catch (e) {
      const msg = getMessage(e);
      console.error("Supabase init error in /api/tradies:", msg);
      return NextResponse.json({ error: `Supabase init error: ${msg}` }, { status: 500 });
    }

    // Fetch tradies (simple select) and then batch fetch users to merge display names.
    let simpleQuery = supabase.from("tradies").select("*");
    if (user_id) simpleQuery = simpleQuery.eq("user_id", user_id);
    else if (id) simpleQuery = simpleQuery.eq("id", id);
    else if (trade)
      simpleQuery = simpleQuery.filter("skills", "cs", JSON.stringify([trade.toLowerCase()]));

      const { data: rowsData, error: rowsError } = await simpleQuery.order("ratings->average", { ascending: false });
    if (rowsError) {
        return NextResponse.json({ error: sanitizeMessage(getMessage(rowsError)) }, { status: 500 });
    }

    const rows = (rowsData || []) as Array<Record<string, unknown>>;
    const userIds = Array.from(new Set(rows.map((r) => (r.user_id as string) || "").filter(Boolean)));

    type UserRow = { id: string; name?: string };
    let usersMap: Record<string, UserRow> = {};
    if (userIds.length > 0) {
      const { data: usersData, error: usersError } = await supabase.from("users").select("id, name").in("id", userIds);
      if (!usersError && usersData) {
        usersMap = Object.fromEntries((usersData as UserRow[]).map((u) => [u.id, { id: u.id, name: u.name }]));
      }
    }

    const merged = rows.map((r) => ({ ...r, users: usersMap[(r.user_id as string) || ""] ?? null }));
    return NextResponse.json(merged, { status: 200 });
  } catch {
    return NextResponse.json({ error: "Unknown server error" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const { user_id, availability } = await request.json();

    const supabase = createClient();

    const { data: tradie, error: tradieError } = await supabase
      .from("tradies")
      .select("id")
      .eq("user_id", user_id)
      .single();

    if (tradieError || !tradie) {
      console.error("Tradie not found:", tradieError?.message);
      return NextResponse.json({ error: "Tradie not found" }, { status: 404 });
    }

    const { data, error } = await supabase
      .from("availability")
      .insert({
        id: crypto.randomUUID(),
        user_id: user_id,
        available_dates: { start: availability.start, end: availability.end },
      })
      .select();

    if (error) {
      console.error("Availability insert error:", error);
      return NextResponse.json({ error: getMessage(error) }, { status: 500 });
    }

    console.log("Availability inserted:", data);

    return NextResponse.json({
      message: "Availability updated",
      data: data[0],
    });
  } catch (err) {
    console.error("Error updating availability:", err);
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
