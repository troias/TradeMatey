import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const clientId = process.env.HUBSPOT_CLIENT_ID;
  const scopes = (
    process.env.HUBSPOT_SCOPES ||
    "crm.objects.contacts.read crm.objects.contacts.write"
  )
    .split(" ")
    .join("%20");
  if (!clientId)
    return NextResponse.json(
      { error: "missing HUBSPOT_CLIENT_ID" },
      { status: 500 }
    );

  const origin =
    process.env.NEXT_PUBLIC_APP_URL || `${url.protocol}//${url.host}`;
  const redirectUri = `${origin}/api/hubspot/oauth/callback`;

  const authUrl = `https://app.hubspot.com/oauth/authorize?client_id=${clientId}&scope=${scopes}&redirect_uri=${encodeURIComponent(
    redirectUri
  )}`;
  return NextResponse.redirect(authUrl);
}
