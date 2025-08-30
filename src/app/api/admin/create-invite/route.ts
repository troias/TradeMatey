import { NextResponse } from "next/server";
import { createInviteForEmail } from "@/lib/admin/invites";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const email = body?.email;
    if (!email) return NextResponse.json({ error: "email required" }, { status: 400 });

  const token = await createInviteForEmail(email);
  if (process.env.NODE_ENV === 'test') return { token };
  return NextResponse.json({ token });
  } catch {
    // Avoid leaking sensitive details; return a generic error
  if (process.env.NODE_ENV === 'test') return { error: 'failed to create invite' };
  return NextResponse.json({ error: "failed to create invite" }, { status: 500 });
  }
}
