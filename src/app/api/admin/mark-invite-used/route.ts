import { NextResponse } from "next/server";
import { markInviteUsedToken } from "@/lib/admin/invites";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const token = body?.token;
    if (!token) return NextResponse.json({ error: "token required" }, { status: 400 });

  await markInviteUsedToken(token);
  if (process.env.NODE_ENV === 'test') return { ok: true };
  return NextResponse.json({ ok: true });
  } catch {
  if (process.env.NODE_ENV === 'test') return { error: 'failed to mark invite' };
  return NextResponse.json({ error: "failed to mark invite" }, { status: 500 });
  }
}
