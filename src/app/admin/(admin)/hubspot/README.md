HubSpot CRM Card -> Admin UI confirm-delete

This folder contains a simple Admin UI page used by the HubSpot CRM Card flow.

How it works (prototype):

- HubSpot CRM Card should open an external link to:
  https://your-app.example.com/admin/hubspot/confirm-delete?email={{contact.email}}&id={{contact.external_user_id}}

- The page will redirect to `/admin/login?next=...` if no `tm_admin_token` exists in localStorage. In production you should integrate SSO and set the admin session cookie or token.

- After SSO, the admin confirms deletion and the page POSTs to `/api/admin/ui/delete` with headers:

  - x-idempotency-key: UUID
  - x-surface: hubspot_crm_card

- Server-side `/api/admin/ui/delete` calls the `soft_delete_user` RPC, writes audit/tombstone, and enqueues outbox events.

Next steps:

- Replace localStorage token check with proper cookie/session + server-side session validation.
- Add stricter UI auth guard and role checks on the client if desired.
- Harden UX and error handling.
