HubSpot Worker

What this worker does

- Polls `hubspot_sync_queue` using the DB lock function and syncs users to HubSpot portals using stored OAuth tokens in `hubspot_portals`.

Files

- `src/workers/hubspot/worker.ts` - scaffold worker process (Node/TS)
- `supabase/migrations/20250825_hubspot_tokens.sql` - adds `hubspot_portals` and `hubspot_token_audit` tables

Environment

- SUPABASE_URL - your Supabase URL
- SUPABASE_SERVICE_ROLE_KEY - service role key for supabase client (keep secret and run worker on trusted machine)

Run locally

1. Apply migrations.
2. Install deps and build (if using TS runner):

```bash
npm install
npx ts-node-esm src/workers/hubspot/worker.ts
```

Notes

- The current worker is a scaffold; implement the real HubSpot OAuth token refresh, DLQ, retry/backoff, and contact property mapping before running in production.
