import { NextResponse } from "next/server";

/**
 * HubSpot CRM Card fetch endpoint.
 * HubSpot POSTs a payload containing the contact id and optionally properties.
 * We return a card which includes an action that opens your Admin confirmation UI.
 */
export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => null)) as any;
    // HubSpot sends objectId (contact id) and may include properties in the payload
    const objectId = body?.objectId || body?.objectId?.toString?.();
    const properties = body?.properties || body?.object?.properties || {};

    // Try to find external_user_id property from the contact (if available)
    const externalUserId =
      properties?.external_user_id?.value ||
      properties?.external_user_id ||
      null;

    // Admin UI base where employees sign in and confirm destructive actions
    const adminUiBase =
      process.env.ADMIN_UI_BASE_URL || "https://app.example.com/admin";

    // Build confirmation URL which the CRM Card will open (employee must sign in there)
    const confirmUrl = new URL(`${adminUiBase}/hubspot/confirm-delete`);
    // Provide the params expected by the Admin UI confirm page
    // Prefer the external_user_id (TradeMatey user id) for `id`, and pass the contact email
    if (externalUserId) confirmUrl.searchParams.set("id", externalUserId);
    const contactEmail = properties?.email?.value || properties?.email || null;
    if (contactEmail) confirmUrl.searchParams.set("email", contactEmail);

    const card = {
      cards: [
        {
          id: "tradie-matey-card",
          title: "Tradie Matey",
          sections: [
            {
              heading: "Account",
              properties: [
                { label: "Contact ID", value: objectId || "—" },
                { label: "External User ID", value: externalUserId || "—" },
              ],
              // Open the Admin confirmation UI so the employee signs in separately
              actions: [
                {
                  id: "open_confirm",
                  text: "Delete / Suspend",
                  // HubSpot supports an action that opens a URL — we provide the admin UI URL
                  // HubSpot will open this in a modal or new tab depending on configuration
                  url: confirmUrl.toString(),
                  style: "danger",
                  requiresConfirmation: true,
                },
              ],
            },
          ],
        },
      ],
    };

    return NextResponse.json(card);
  } catch (e) {
    console.error("hubspot card fetch error", e);
    return NextResponse.json({ cards: [] }, { status: 200 });
  }
}
