Overview

This document explains the work added to support Team invites/roles and a production-ready HubSpot sync worker that supports both Private App tokens (PAT) and OAuth public app flows.

What I added

- DB migration: `supabase/migrations/20250827_team_and_permissions.sql`
  - Adds `invitations`, `permissions`, `hubspot_portal_settings`, `hubspot_worker_metrics` and token vault columns on `hubspot_portals`
  - Adds `upsert_hubspot_worker_metric` RPC
  - Adds small RLS policies for `role_bindings` and `users`.
- Worker updates: `src/workers/hubspot/worker.ts`
  - AES-256-GCM encryption helpers for vaulting tokens
  - Private-app support (HUBSPOT_TOKEN/HUBSPOT_ACCESS_TOKEN) and conditional OAuth refresh (when CLIENT_ID/SECRET available)
  - Portal property mapping via `hubspot_portal_settings.property_mappings`
  - Records metrics via `upsert_hubspot_worker_metric`
- Invite flow + Team UI
  - Client: `src/app/admin/(admin)/team/invite/page.tsx` and `src/app/admin/(admin)/team/page.tsx`
  - API: `src/app/api/admin/team/invite/route.ts` and `src/app/api/admin/team/accept/route.ts`
  - Audit listing: `src/app/api/admin/audit/route.ts`
- Scripts: `scripts/reencrypt_tokens.ts` (placeholder to re-encrypt existing tokens)

Quick setup (local/dev)

1. Apply DB migration

Use your existing supabase/migration flow or psql to apply the SQL file:

```bash
# Example using psql (set PG_CONNECTION_STRING to your DB)
psql "$PG_CONNECTION_STRING" -f supabase/migrations/20250827_team_and_permissions.sql
```

Or use the supabase CLI if you manage migrations there.

2. Environment variables

Set these in `.env.local` or env for the worker process:

- SUPABASE_URL - your supabase URL
- SUPABASE_SERVICE_ROLE_KEY - service role key (worker needs service role)
- HUBSPOT_TOKEN (or HUBSPOT_ACCESS_TOKEN / HUBSPOT_PAT) - your private HubSpot app token (PAT)
- APP_TOKEN_KEY - symmetric key used to encrypt/decrypt tokens locally (32+ chars). Use a KMS-managed key in prod.
- (Optional) HUBSPOT_CLIENT_ID and HUBSPOT_CLIENT_SECRET - only if you have a public app and want OAuth refresh support

3. Run the worker (private app mode)

```bash
# recommended: build/transpile then run
npx tsc src/workers/hubspot/worker.ts --outDir dist --esModuleInterop --module es2020 --target es2020
node dist/src/workers/hubspot/worker.js
```

Or try `npx ts-node-esm src/workers/hubspot/worker.ts` if your environment supports it.

4. Using the Team UI

- Visit `/admin/team/invite` to create an invite. It will insert a row into `invitations` with a token.
- Send the token link via email to the invitee (not implemented automatically).
- The invitee can call the accept endpoint (`POST /api/admin/team/accept`) with `{ token, email }`. The accept handler will mark the invite accepted and will attempt to call `assign_role` RPC.

Notes on assign_role and accept flow

- `assign_role` RPC exists in the DB and is SECURITY DEFINER; however the server must call it using the service role or via a secure route to avoid privilege escalation. The simple accept handler here calls the RPC directly — in production you should perform additional verification (email ownership) and call RPC using the service role or through a privileged server process.

Security / production hardening

- Replace `APP_TOKEN_KEY` local encryption with KMS (AWS/GCP/Azure) envelope encryption.
- Re-encrypt existing plaintext tokens using a secure plan: rotate the APP_KEY and re-encrypt tokens with new key via a controlled script.
- Ensure `SUPABASE_SERVICE_ROLE_KEY` never reaches the browser. Worker must run in a secure environment.
- Audit and monitoring: wire `hubspot_worker_metrics` into your monitoring stack (Prometheus, Datadog, etc.) or query metrics via Supabase.

How the worker decides which token to use

Order of resolution for token:

1. `portal.encrypted_access_token` (decrypted using APP_TOKEN_KEY)
2. `portal.access_token` (plaintext column)
3. `HUBSPOT_TOKEN` / `HUBSPOT_ACCESS_TOKEN` env var (private-app PAT)

If HUBSPOT_CLIENT_ID and HUBSPOT_CLIENT_SECRET are present worker runs in OAuth mode and performs refresh when needed.

What I didn't implement (and recommended next steps)

- Email sending for invites (SMTP/SendGrid). The invite insertion only stores the token.
- Proper role approval workflow UI (I added the pending structure but not the multi-approver flow).
- Re-encryption script that performs the AES-GCM encryption for each portal access/refresh token (placeholder script added).
- Full test harness — I can add unit tests for token refresh and upsert logic.

If you want me to continue with one of these:

- A: Implement invite accept -> create user + assign role + email confirmation flow
- B: Implement full re-encrypt script that reads plaintext tokens, encrypts them with AES-GCM (using APP_TOKEN_KEY) and writes encrypted fields back to `hubspot_portals` then optionally clears plaintext columns
- C: Add a small test harness and endpoint to simulate a hubspot_sync_queue row and validate worker behavior locally

Tell me which of A/B/C you want next and I'll implement it and provide exact run commands.

---

Commands — re-encrypt and testing

1. Build the project (TypeScript compile)

```bash
npx tsc
```

2. Re-encrypt existing tokens (runs `scripts/reencrypt_tokens.ts`)

```bash
node dist/scripts/reencrypt_tokens.js
```

3. Run worker (compiled)

```bash
node dist/src/workers/hubspot/worker.js
```

4. Enqueue a test user for sync (use service role key)

```bash
node dist/scripts/enqueue_test_user.js <USER_UUID>
```

Notes

- The re-encrypt tool uses `APP_TOKEN_KEY` from env to encrypt plaintext access/refresh tokens. Test locally first and backup DB.
- The accept-invite route will create a minimal `users` + `profiles` row and add an entry into `role_bindings`.
