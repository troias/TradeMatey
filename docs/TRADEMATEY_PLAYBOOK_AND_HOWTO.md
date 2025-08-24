TradeMatey × HubSpot Playbook — How to use

Purpose

- Document the database and app changes made to move TradeMatey toward a single-source-of-truth Supabase/Postgres architecture with audit, soft-delete, outbox/eventing, canonical RBAC, idempotency, and a HubSpot control-surface integration.

Checklist (requirements extracted)

- Single source of truth in Supabase/Postgres: Done (migrations add audit, tombstones, outbox, role_bindings). Status: Done (migrations added, not applied).
- Audit log & tombstones: Done (migrations create `audit_log` and `tombstones`). Status: Done.
- Soft-delete RPCs (idempotent): Done (RPCs `soft_delete_user` / `restore_user` added). Status: Done.
- Outbox / eventing primitives: Done (table `outbox_events`, `enqueue_outbox()` present). Status: Done.
- Canonical RBAC via `role_bindings` + compatibility view: Done (compatibility view `user_roles_if_migrated` added). Status: Done.
- Idempotency keys: Done (table `idempotency_keys` and RPC handling). Status: Done.
- Admin APIs use DB RPCs & idempotency: Partially done (admin delete/restore endpoints call RPCs; added UI confirm-delete). Status: Partially Done — server endpoints updated, further hardening recommended.
- HubSpot integration (control surface, card -> admin UI): Done (CRM card fetch route opens Admin UI confirm-delete). Status: Done for UI; worker/token management pending.
- Outbox consumer (HubSpot worker) + per-portal OAuth tokens & refresh: Not done. Status: Deferred.
- Harden role assignment with assign_role RPC + revoke direct writes: Done (new migration `20250825_secure_role_assignment.sql`). Status: Done (migration added, not applied).
- Tests / smoke-run: Not done (requires applying migrations and running DB). Status: Deferred.

Files added/edited (key artifacts)

- `supabase/migrations/20250823_phase2_audit_soft_delete.sql` — audit, tombstones, outbox, RPCs (idempotent patterns)
- `supabase/migrations/20250824_add_user_roles_view.sql` — compatibility view `user_roles_if_migrated`
- `supabase/migrations/20250825_secure_role_assignment.sql` — pending_role_changes, `assign_role`, `apply_pending_role_change`, revoke writes
- `src/app/api/admin/users/[id]/route.ts` — admin delete/restore endpoints (call DB RPCs)
- `src/app/api/crm/upsert/route.ts` — CRM upsert uses `user_roles_if_migrated`
- `src/app/api/hubspot/card/fetch/route.ts` — HubSpot CRM card fetch endpoint (returns Admin UI URL)
- `src/app/api/admin/ui/delete/route.ts` — Admin UI server endpoint that calls `soft_delete_user` RPC (idempotency header supported)
- `src/app/admin/(admin)/hubspot/confirm-delete/page.tsx` — Admin UI confirmation page (requires employee sign-in)
- `src/app/api/admin/roles/request/route.ts` and `src/app/api/admin/roles/approve/route.ts` — request/approve endpoints for safe role changes
- `docs/ROLE_ASSIGNMENT.md` — quick doc for the role workflow (short)

How to apply the DB migrations (development)

1. Using supabase CLI (recommended):

   - Ensure `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` or local `DATABASE_URL` are set for your dev target.
   - From repo root, run your usual migration command (example):

```bash
supabase db push --project-ref your-project-ref
# or if you use a migration runner that applies files in `supabase/migrations/`
# psql "$DATABASE_URL" -f supabase/migrations/20250823_phase2_audit_soft_delete.sql
# psql "$DATABASE_URL" -f supabase/migrations/20250824_add_user_roles_view.sql
# psql "$DATABASE_URL" -f supabase/migrations/20250825_secure_role_assignment.sql
```

2. Verify post-migration

- Connect with `psql` or the Supabase SQL editor and run:

```sql
SELECT tablename FROM pg_tables WHERE schemaname='public' AND tablename IN ('outbox_events','tombstones','audit_log','role_bindings','pending_role_changes');
SELECT * FROM public.user_roles_if_migrated LIMIT 5;
```

How to test the Admin delete flow (local)

1. Start Next.js dev server: `npm run dev`.
2. As an admin user, visit the Admin UI and open the HubSpot CRM card which will redirect to the Admin confirm page.
3. Confirm-delete page will require employee sign-in (Supabase session). After sign-in, confirm and the UI calls POST `/api/admin/ui/delete` with `x-idempotency-key` header. The server calls `soft_delete_user` RPC.
4. Verify DB writes:

```sql
SELECT * FROM public.audit_log WHERE table_name='users' ORDER BY created_at DESC LIMIT 5;
SELECT * FROM public.tombstones WHERE table_name='users' ORDER BY created_at DESC LIMIT 5;
SELECT * FROM public.outbox_events WHERE event_type = 'user.deleted' ORDER BY created_at DESC LIMIT 5;
```

How to test role assignment workflow

1. POST to `/api/admin/roles/request` (body: `{ targetUserId, role, reason }`) as an admin session.
2. As two different approvers, POST to `/api/admin/roles/approve` with `{ pendingId, approve: true }`. When approved the API calls `apply_pending_role_change` RPC which uses `assign_role` to create a `role_bindings` entry and write an audit row.
3. Verify `role_bindings`, `pending_role_changes`, and `audit_log` rows.

HubSpot integration — what's done vs. required

- Done: HubSpot CRM Card now opens Admin UI confirm-delete. The app enqueues sync tasks (`hubspot_sync_queue` / `outbox_events`) when user role changes or deletions happen.
- Required (next work): Implement an outbox worker that:
  - Reads `outbox_events` or `hubspot_sync_queue` safely (use the existing `lock_hubspot_sync_queue` helper),
  - Loads per-portal OAuth tokens (table migration required), refreshes tokens as needed,
  - Calls HubSpot API to create/patch contacts and map roles to multi-select properties,
  - Retries transient errors and moves to DLQ after TTL.

Minimal outbox worker sketch

- Node process (worker.js) that periodically calls `SELECT * FROM public.lock_hubspot_sync_queue(10)` or polls `outbox_events`, then invokes HubSpot API. Store tokens in `hubspot_portals` table (not yet added).

Security and hardening notes

- After applying `20250825_secure_role_assignment.sql`, direct writes to `role_bindings` are revoked for `authenticated`. Keep a service role or admin-only RPC for exceptional writes.
- Make sure `assign_role` and `apply_pending_role_change` are only callable by trusted server code or actors validated by the DB policy.
- Enforce RLS policies on `users`, `role_bindings`, and `outbox_events` as needed (some example policies exist in migrations; review before applying in production).

Next steps I can take (pick one)

1. Apply these migrations to a development Supabase instance and run smoke tests (requires DB credentials).
2. Scaffold the outbox worker and token storage + HubSpot OAuth flow (I'll add migrations + worker code).
3. Harden RPCs and add unit/integration tests for the RPCs and admin endpoints.

If you want me to proceed, tell me which next step (1/2/3) and I'll execute it. If you'd like DB migration applied now, provide a dev `DATABASE_URL` or run the commands above locally.

Completion summary

- I added DB migrations, server endpoints, Admin UI confirm flow, and a role-request/approval flow; this doc maps status for each requirement and gives exact commands to apply and test locally.
