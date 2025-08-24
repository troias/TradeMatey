import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  if (!code)
    return NextResponse.json({ error: "missing code" }, { status: 400 });

  const clientId = process.env.HUBSPOT_CLIENT_ID;
  const clientSecret = process.env.HUBSPOT_CLIENT_SECRET;
  const origin =
    process.env.NEXT_PUBLIC_APP_URL || `${url.protocol}//${url.host}`;
  const redirectUri = `${origin}/api/hubspot/oauth/callback`;

  if (!clientId || !clientSecret)
    return NextResponse.json(
      { error: "missing hubspot client secret or id" },
      { status: 500 }
    );

  // Exchange code for tokens
  const tokenRes = await fetch("https://api.hubapi.com/oauth/v1/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      code,
    }),
  });
  const tokenJson = await tokenRes.json();
  if (tokenJson.error)
    return NextResponse.json(
      { error: tokenJson.error_description || tokenJson.error },
      { status: 500 }
    );

  // tokenJson contains access_token, refresh_token, expires_in, hub_domain, hub_id
  const supabase = createServerClient();
  const portalId =
    tokenJson.hub_id || tokenJson.hub_domain || tokenJson.portalId;

  const { error } = await supabase
    .from("hubspot_portals")
    .upsert(
      {
        portal_id: portalId,
        access_token: tokenJson.access_token,
        refresh_token: tokenJson.refresh_token,
        expires_at: new Date(
          Date.now() + (tokenJson.expires_in || 0) * 1000
        ).toISOString(),
        scopes: tokenJson.scope ? tokenJson.scope.split(" ") : [],
      },
      { onConflict: "portal_id" }
    );
  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.redirect("/admin?hubspot_installed=1");
}
