# Design: Health-check API

Title: Health-check endpoint

Summary
- Add a lightweight internal health-check endpoint at `/api/internal/health` that returns service status and basic connectivity checks (Supabase, optionally Stripe). Intended for staging and uptime checks.

Goals
- Provide a fast, low-overhead endpoint that returns a JSON payload with basic status indicators.
- Be safe for internal use (route under `internal/` and not linked from public UI).

Acceptance criteria / tests
- `GET /api/internal/health` returns 200 with body { status: 'ok', services: { supabase: 'ok' | 'error' } }

Implementation notes
- Implement a simple API route using the Next.js app router at `src/app/api/internal/health/route.ts`.
- For Supabase check, call `supabase.from('users').select('id').limit(1)` using server client to verify connectivity, but keep it optional and fail gracefully.

Rollout
- Deploy to staging and add the endpoint to monitoring. Keep it internal-only.
