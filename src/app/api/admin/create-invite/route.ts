import { NextResponse } from "next/server";
import { createInviteForEmail } from "@/lib/admin/invites";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const email = body?.email;
    if (!email) return NextResponse.json({ error: "email required" }, { status: 400 });

  const token = await createInviteForEmail(email);
  return NextResponse.json({ token });
  } catch {
    // Avoid leaking sensitive details; return a generic error
  return NextResponse.json({ error: "failed to create invite" }, { status: 500 });
  }
}
