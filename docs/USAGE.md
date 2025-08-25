# TradeMatey — Quick start & flows

Quick start — run locally (Windows PowerShell-friendly)

Install dependencies (use cmd to avoid PowerShell npm.ps1 execution policy issues):

```powershell
cmd /c "cd /d d:\Programming\projects\TradeMatey && npm install"
```

Start the Next dev server (background):

```powershell
Start-Process -NoNewWindow -FilePath 'cmd' -ArgumentList '/c cd /d d:\Programming\projects\TradeMatey && npm run dev'
```

Local server: http://localhost:3000

Run tests:

```powershell
cmd /c "cd /d d:\Programming\projects\TradeMatey && npm test"
```

Run a single Jest test file:

```powershell
cmd /c "cd /d d:\Programming\projects\TradeMatey && npx jest __tests__/api/health.test.ts --runInBand --colors --verbose"
```

Build and start production:

```powershell
cd /d d:\Programming\projects\TradeMatey
npm run build
npm start
```

## Required environment variables

Make sure `.env.local` contains at minimum (see repo’s `.env.local` for examples):

- NEXT_PUBLIC_SUPABASE_URL
- NEXT_PUBLIC_SUPABASE_ANON_KEY
- SUPABASE_SERVICE_ROLE_KEY
- SUPABASE_URL
- NEXTAUTH_URL
- NEXTAUTH_SECRET
- GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET (if using Google)
- STRIPE_SECRET_KEY, NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY (for payments)
- HUBSPOT_* (if HubSpot integrations are used)

Notes:

- Do not commit secrets. Use your environment or CI secrets.
- In test runs we added a test-friendly Supabase stub when `NODE_ENV=test`; CI should still provide appropriate secrets for integration tests if needed.

## Where things live in the codebase (quick map)

- Frontend pages/layout:
  - Home: `src/app/page.tsx`
  - App layout: `src/app/layout.tsx`, global CSS: `src/app/globals.css`
  - Routes in app: `admin`, `auth`, `client`, `tradie`, `marketing`, `support`, `community`, `finance`, `select-role`, etc.
- API: `src/app/api/*`
  - Examples: `jobs/`, `bookings/`, `payments/`, `users/`, `analytics/`, `hubspot/`, `webhooks/`
- Auth & providers:
  - `src/components/Providers.tsx` — QueryClient, Auth provider, Job provider, `useAuth()` hook
  - `src/lib/auth.tsx` — NextAuth options and providers
- Supabase clients:
  - Browser client: `src/lib/supabase/client.ts`
  - Server client: `src/lib/supabase/server.ts` (includes a test stub)
  - Shared client: `src/lib/supabase.ts`
- Stripe / payments: `src/lib/stripe.ts`
- Types & utils: `src/lib/types.ts`, `src/lib/utils.ts`
- Tests: `__tests__` and Jest config in `jest.config.js`, `jest.setup.js`
- Docs & templates: `docs/*`, `.github/ISSUE_TEMPLATE/*`, `.github/PULL_REQUEST_TEMPLATE/*`
- Health check (new example): `src/app/api/internal/health/route.ts` — live at `/api/internal/health`

## Main user flows (what page + main API endpoints involved)

Below are top-level flows and where to find the code to edit/inspect if you change or extend behavior.

### New client / marketing flow
Pages:
- Marketing/home: `src/app/page.tsx`
- Client job posting UI: `src/app/client/post-job` (component path may vary)
APIs:
- Jobs POST: `src/app/api/jobs/*` (create job, search jobs)
- Payments for milestone setup: `src/app/api/payments/*`
Notes:
- Home fetches analytics from `src/app/api/analytics`.

### Client: Post job -> booking -> payment
Steps:
- Client fills post-job form
- Server creates job: `src/app/api/jobs`
- Tradie accepts -> booking created: `src/app/api/bookings`
- Milestone payments via `src/app/api/payments` (Stripe)
Key files: job forms in `src/components` or `src/app/client/*`, API handlers under `src/app/api/jobs` and `src/app/api/bookings`.

### Tradie registration & dashboard
Pages:
- Tradie register: `src/app/tradie/register`
- Tradie dashboard: `src/app/tradie/dashboard`
APIs:
- User registration/profile: `src/app/api/users/*`
- Availability: `src/app/api/availablity/*`
Notes:
- Provider `useAuth()` and user roles are handled in `src/components/Providers.tsx`.

### Auth / role selection / session
Files:
- NextAuth config: `src/lib/auth.tsx`
- Session & role loading: `src/components/Providers.tsx` (loads roles from `user_roles` or `profiles`)
Flow:
- Sign in via credentials or Google (if enabled)
- `Providers` stores active role in localStorage and cookie `activeRole` for server routes to respect

### Admin flows
Areas:
- Admin UI: `src/app/admin/*`
- Admin APIs: `src/app/api/admin/*` (users, roles, metrics, hubspot installs, hubspot dlq, etc.)
- DB migrations: `supabase/migrations/*` (see migration filenames for schema changes)
Typical admin tasks:
- Invite team members: `admin/team/invite` & `admin/team/accept`
- Approve role requests: `admin/roles/approve`
- Admin metrics and syncs: `admin/metrics`, `admin/sync`
Notes:
- Admin operations often require `SUPABASE_SERVICE_ROLE_KEY` on the server side; be careful with key usage.

### Payments / Stripe
Files:
- `src/lib/stripe.ts` (helper)
- Server endpoints under `src/app/api/payments/*`
Flow:
- Initialize payment intent or checkout session on server
- Client uses Stripe.js / `@stripe/react-stripe-js` to confirm payment
Contract:
- Secure secret keys in server environment; only publish `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` to client.

### Bookings, milestones, disputes
Files:
- `src/app/api/bookings/*`, `src/app/api/disputes/*`
Flow:
- Booking created after tradie accepts
- Milestones used for staged payment; disputes escalate to QBCC support logic (domain-specific)
Edge cases:
- Payment failures, partial completion, cancelations, dispute time windows

### Community / Forum
Pages: `src/app/community/*`
APIs: `src/app/api/community/*`, `forum/`
Notes: typical CRUD for posts/comments, use moderation controls in admin.

### HubSpot & integrations
Files: `src/app/api/hubspot/*`, workers in `src/workers/hubspot/*`
Flow:
- OAuth & webhook endpoints: `hubspot/oauth/*`, `hubspot/webhooks`
- Background sync queue: see `workers/hubspot`
Notes: HubSpot tokens are in environment variables; ensure secure key rotation and DB storage encryption.

### Internal dev utilities
- Health-check (added): `/api/internal/health` — quick status of Supabase connectivity
- CI workflow added: `.github/workflows/ci.yml` (runs focused health test then full tests)

## Contracts (small, useful format)

Example: POST `/api/jobs`

- Inputs: job object { title, description, clientId, location, budget, milestones[] }
- Outputs: 201 job object with id, status 'open'
- Errors: 400 validation, 401 unauthenticated, 500 server error
- Tests: unit tests validate validation rules and API shape

Example: GET `/api/internal/health`

- Inputs: none
- Output: { status: 'ok', services: { supabase: 'ok' | 'error' | 'skipped' } }
- Error behavior: always responds 200 unless server failure; services field marks per-service status

## Edge cases & failure modes (3–5 per flow)

### Auth/session:
- Missing or expired tokens -> redirect to sign-in, make routes tolerant and return 401 for APIs.
- Multi-role users: ensure active role stored and validated for each action (Providers sets cookie + localStorage).

### Payments:
- Payment confirmation failures -> do not mark milestone complete; provide retry + idempotency.
- Webhook duplication -> deduplicate by event id.

### Jobs/bookings:
- Race on accepting job (multiple tradies) -> use DB-level locking or transactional checks.
- Partial failure during booking/payment -> implement compensating transactions or cancellation flow.

### Integrations (HubSpot):
- Token expiration and refresh -> use refresh flows and safe retry with backoff.
- Webhook ordering -> use idempotency and DLQ (there is an admin dlq route).

### Tests/CI:
- Network calls during unit tests -> use stubs/mocks (we added NODE_ENV=test stub for Supabase); prefer explicit mocking per-test for more control.

## Tests-first / PR workflow (how to contribute)

1. Create a design doc issue: use `.github/ISSUE_TEMPLATE/design-doc.md` or `docs/RFC_TEMPLATE.md`.
2. Write tests first: add unit/integration tests in `__tests__` that assert acceptance criteria.
3. Implement small changes. Keep PRs focused.
4. Open PR using `.github/PULL_REQUEST_TEMPLATE/default.md`. CI will run the focused health-check test first for quick feedback, then the full suite.

Create PR via GitHub CLI:

```powershell
gh pr create --base main --head your-branch --title "Short title" --body "Describe changes and link design doc #<n>"
```

## Troubleshooting & tips

- PowerShell + npm.ps1: use cmd wrappers or run `Set-ExecutionPolicy RemoteSigned -Scope Process` as appropriate (preferred: use cmd wrapper shown above).
- If a test tries to call Supabase in unit tests, check NODE_ENV=test stub in `src/lib/supabase/server.ts` or mock per test.
- To inspect server-side runtime logs, watch the terminal running `npm run dev` — Next prints builds and route compiles.
- For DB schema changes, check `supabase/migrations/*`.

## Where to start improving / next small wins

- Add integration tests that run against a disposable test DB (Supabase test project) for core flows: jobs -> booking -> payments (behind feature flag).
- Add automated staging monitor: scheduled GitHub Action hits `/api/internal/health` on staging.
- Implement the analytics stub (we can do this next) so homepage shows numbers when running locally without production data.

## Short summary (one-line)

Run `npm run dev`, open http://localhost:3000, and use the `client`, `tradie`, and `admin` pages in `src/app/*`; modify backend behavior in `src/app/api/*`, and follow the tests-first PR flow using the provided templates and CI.
