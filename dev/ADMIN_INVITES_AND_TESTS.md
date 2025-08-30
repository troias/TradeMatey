# Admin invite flow, RPC, and test harness

This file documents the admin-invite flow implemented in this repo, how admin users are created/redeemed, and how to run the SQL test harness and related helper scripts added under `dev/`.

Keep secrets out of the repo. Never commit `SUPABASE_SERVICE_ROLE_KEY`, DB passwords, or similar values.

## Overview

Primary pieces implemented:

- Postgres RPC: `redeem_admin_invite(p_token text, p_user_id uuid, p_actor_id uuid DEFAULT NULL)` — atomically validates and redeems an invite, grants `admin` role, marks invite used, and inserts an `admin_audit` row. Migration: `supabase/migrations/20250826_redeem_admin_invite.sql` (function definition).
- Migration: `supabase/migrations/20250826_admin_audit.sql` — `admin_audit` table to record actions.
- Server API endpoints:
  - `POST /api/admin/create-invite` (create an invite) — server-only (tests/helpers wrap usage).
  - `POST /api/admin/validate-invite` (validate token)
  - `POST /api/admin/redeem-invite` (redeem current session user)
  - `POST /api/admin/redeem-on-behalf` (admin-only: redeem an invite for another user, records `actor_user_id`)
  - `GET  /api/admin/audit` (admin-only: returns `admin_audit` rows)
- Client UI bits:
  - `src/app/admin/login/page.tsx` — invite-token input + validate/gating for sign-in
  - `src/app/auth/callback/page.tsx` — shows transient redeem result message and triggers `/api/admin/redeem-invite` when `invite_token` present
  - `src/app/admin/audit/page.tsx` — simple client admin audit viewer with filtering & pagination

## How the invite flow works (high-level)

1. Admin creates an invite (server-only) with a token and optional email.
2. Invite is single-use and may expire (see `admin_invites` schema).
3. A user signs in and visits the auth callback with `invite_token` query param; server attempts to redeem via the RPC (or an admin can redeem on behalf using the `redeem-on-behalf` endpoint).
4. `redeem_admin_invite` acquires an advisory lock on the token, validates token exists/expiry/email binding, ensures `p_user_id` exists, optionally validates `p_actor_id` is an admin, inserts `admin` role idempotently, marks invite used (conditional update), and inserts an `admin_audit` row.
5. Server endpoints map RPC SQLSTATE-coded exceptions to sensible HTTP statuses (404, 409, 410, 403, etc.).

## SQLSTATE → HTTP mapping (server handlers)

The server routes map the RPC error `code` to HTTP responses; the codes used in the migration and their mapping are:

- `P0001` — invalid_invite → 404
- `P0003` — invite_already_used → 409
- `P0004` — invite_expired → 410
- `P0005` — invite_email_mismatch → 400
- `P0006` — user_not_found → 404
- `P0007` — actor_not_admin → 403

Adjust these mappings in `src/app/api/admin/*.ts` if you want different status codes.

## Creating admin users

Two safe approaches:

1) Invite-based (recommended)

  - Create an invite with server-only endpoint `POST /api/admin/create-invite` (implementation expects to be server-side and use the service role client).
  - Send the token to the user (email/magic link). After the user signs in, visiting the auth callback with `?invite_token=<token>` will redeem it and grant the `admin` role.

2) Manual DB (for emergency or bootstrap)

  - Connect to your Postgres DB and run (example):
    ```sql
    INSERT INTO user_roles (user_id, role) VALUES ('<user-uuid>', 'admin');
    INSERT INTO admin_audit (token, target_user_id, actor_user_id, action) VALUES (NULL, '<user-uuid>', NULL, 'manual_grant');
    ```
  - This skips invite checks; prefer invite flow in normal operations so actions are audited and controlled.

## Files I added and their purpose

- `supabase/migrations/20250826_redeem_admin_invite.sql` — RPC function (redemption logic + SQLSTATE-coded exceptions)
- `supabase/migrations/20250826_admin_audit.sql` — admin_audit table (if not already present)
- `src/app/api/admin/*.ts` — API endpoints for invite lifecycle and audit (server wrappers)
- `src/app/admin/audit/page.tsx` — client admin audit viewer
- `src/app/auth/callback/page.tsx` — transient redeem-result UI change
- `dev/docker-compose.yml` — optional local Postgres for tests
- `dev/sql-tests/01_create_schema.sql` — minimal schema for tests (creates users, user_roles, admin_invites, admin_audit), includes `02_redeem.sql`
- `dev/sql-tests/02_run_tests.sql` — SQL test scenarios (invalid token, user not found, success, already used, actor not admin)
- `dev/sql-tests/init/02_redeem.sql` — copy of the RPC migration included so the DB has the function on init
- `dev/run_sql_tests.ps1` — main PowerShell test-runner (hosted or docker mode, -DryRun, -ConfirmRun)
- `dev/run_sql_tests_launcher.ps1` — launcher that invokes the runner with `-File` so `param` is supported in interactive shells
- `dev/ADMIN_INVITES_AND_TESTS.md` — this file

## Running the SQL test harness (summary)

1) Dry-run (derive defaults from `SUPABASE_URL`, no SQL executed):

```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
$env:SUPABASE_URL='https://<project>.supabase.co'
.\dev\run_sql_tests_launcher.ps1 -DryRun
```

2) Hosted run (interactive confirmation)

```powershell
$env:SUPABASE_URL='https://<project>.supabase.co'
$env:PGPASSWORD='<PASSWORD>'         # set only in session
.\dev\run_sql_tests_launcher.ps1
```

3) Non-interactive hosted run (careful)

```powershell
$env:SUPABASE_URL='https://<project>.supabase.co'
$env:PGPASSWORD='<PASSWORD>'
.\dev\run_sql_tests_launcher.ps1 -ConfirmRun
```

4) Docker mode (no hosted creds required)

```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
.\dev\run_sql_tests_launcher.ps1
```

Notes:
- The runner auto-derives `PGHOST`, `PGPORT`, and `PGUSER` from `SUPABASE_URL` when possible. You can override any with `PGHOST`/`PGUSER`/`PGPORT` directly.
- The runner requires `PGPASSWORD` in the session when using PG* vars, or uses `DATABASE_URL` if present.
- The test scripts will modify the database (create users, invites, roles) — do not run them against production.

## How to use the server endpoints (examples)

- Redeem invite (current session user):

  POST /api/admin/redeem-invite
  Body: { "token": "<token>" }

- Redeem on behalf (admin-only):

  POST /api/admin/redeem-on-behalf
  Body: { "token": "<token>", "target_user_id": "<uuid>" }

Server handlers translate RPC SQLSTATE codes to HTTP statuses; see the mapping above.

## Testing the UI

- Admin audit unit test: `__tests__/admin.audit.test.tsx` — mocks `fetch` and renders `src/app/admin/audit/page.tsx`.
- Run Jest normally (project has `npm test`). In PowerShell you may need to set execution policy as shown earlier.

## Safety and rotation

- If `SUPABASE_SERVICE_ROLE_KEY` or other secrets were accidentally committed, rotate them immediately and remove them from history (BFG/git-filter-repo). Don’t share secrets in PRs.
- Prefer dedicated test DB/role for test harness runs instead of production.

## Troubleshooting

- If the launcher complains about `param` when running in this environment, use the launcher `dev/run_sql_tests_launcher.ps1` — it invokes the main script with `-File` so `param` is evaluated.
- If Docker isn't available, use hosted mode with `SUPABASE_URL` + `PGPASSWORD` (session) or `DATABASE_URL`.

## Next steps (optional)

- Add integration tests that call the Next.js endpoints against a disposable test DB (requires wiring in a test DB and CI secrets).
- Add server-side HTTP tests that mock the Supabase server client and assert HTTP responses for different RPC SQLSTATEs.

If you want, I can now:
- update `dev/README.md` to reference this file, or
- add a small Node.js wrapper to run the SQL tests cross-platform without PowerShell.
