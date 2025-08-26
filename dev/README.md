SQL test harness

This folder contains a small Docker Compose + SQL test harness to exercise the `redeem_admin_invite` RPC locally.

How it works

1. `docker-compose.yml` brings up Postgres and runs any `*.sql` files in `dev/sql-tests/init` (from mounted folder).
2. `01_create_schema.sql` builds a minimal schema and includes `02_redeem.sql` from the mounted init dir (expected to be your migration file for `redeem_admin_invite`).
3. `02_run_tests.sql` runs common test scenarios showing expected errors and success.

Run locally (PowerShell):

1) Hosted DB mode (run against Supabase or another hosted Postgres)

Set connection environment variables in your PowerShell session (do NOT commit these):

```powershell
$env:PGHOST = 'aws-0-ap-southeast-2.pooler.supabase.com'
$env:PGPORT = '6543'
$env:PGUSER = 'postgres.lrhuqyvaacqdiomhxype'
$env:PGPASSWORD = '<YOUR_PASSWORD>'
$env:PGDATABASE = 'postgres'
# or use a single DATABASE_URL:
$env:DATABASE_URL = 'postgresql://postgres.lrhuqyvaacqdiomhxype:<YOUR_PASSWORD>@aws-0-ap-southeast-2.pooler.supabase.com:6543/postgres?sslmode=require'
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
.
\dev\run_sql_tests.ps1
```

The script will prompt for confirmation before running against a hosted DB; pass `-DryRun` to only show which scripts would run, or `-ConfirmRun` to skip the interactive prompt non-interactively:

```powershell
.\dev\run_sql_tests.ps1 -DryRun
.\dev\run_sql_tests.ps1 -ConfirmRun
```

2) Docker mode (no host credentials required):

```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
.\dev\run_sql_tests.ps1
```

Notes
- You must place a copy of your `supabase/migrations/20250826_redeem_admin_invite.sql` into `dev/sql-tests/init/02_redeem.sql` so the DB has the function definition when initialising.
- The test harness is intentionally simple; adjust DB connection, ports, or scripts to match your environment.

Developer notes
- The cross-platform Node runner (`dev/run_sql_tests.js`) and the integration test require the `pg` package. Install it locally before running:

```bash
npm install --save-dev pg
```

Or add it to your dev dependencies via package.json and run `npm install`.
