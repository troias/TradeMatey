## AI-assisted workflow for TradeMatey (repo-specific)

This page adapts the repository-level AI-assisted workflow to the TradeMatey codebase. It lists concrete touchpoints (routes, APIs, auth, and env variables) and a short step-by-step recipe to follow when using AI to help implement features in this project.

Key areas in this codebase
- Frontend (Next.js app directory): `src/app`
  - Home page: `src/app/page.tsx`
  - Layout and global UI: `src/app/layout.tsx`, `src/app/globals.css`
  - Subroutes: `admin`, `auth`, `client`, `tradie`, `marketing`, `support`, `community`, `finance`, `select-role`, etc.

- API endpoints: `src/app/api/*` — lots of granular endpoints including `jobs`, `bookings`, `payments`, `users`, `analytics`, `hubspot`, and `webhooks`.

- Auth & Providers: `src/components/Providers.tsx` (Auth + Job contexts), `src/lib/auth.tsx` (NextAuth options).

- Supabase clients: `src/lib/supabase.ts`, `src/lib/supabase/client.ts` (browser vs server patterns).

- Important utilities: `src/lib/stripe.ts`, `src/lib/utils.ts` and `src/lib/types.ts`.

Environment variables used by the app
- NEXT_PUBLIC_SUPABASE_URL
- NEXT_PUBLIC_SUPABASE_ANON_KEY
- SUPABASE_SERVICE_ROLE_KEY
- SUPABASE_URL
- GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET
- STRIPE_SECRET_KEY, NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
- NEXTAUTH_URL, NEXTAUTH_SECRET
- HUBSPOT_* keys

Repo scripts
- Start dev server: `npm run dev` (Next.js)
- Tests: `npm test` (Jest)
- Lint: `npm run lint`

Concrete AI-assisted developer recipe (applies to TradeMatey)
1) Create a design doc issue
   - Use `.github/ISSUE_TEMPLATE/design-doc.md` or `docs/RFC_TEMPLATE.md`.
   - Describe the feature, components affected (frontend route, API endpoints, DB tables), and acceptance tests.

2) Tests first
   - Add unit or integration tests under `__tests__` or next to the components/APIs being changed.
   - Example: to add a new API behavior implement a Jest test that calls the API route handler, or a small integration test that mocks Supabase and asserts response.

3) Implement small, focused changes
   - Use AI to scaffold the implementation for the route or component. Keep PRs to a single responsibility (e.g., implement `GET /api/jobs` pagination, or add `client/post-job` form).
   - Locally run `npm test` and `npm run dev` and verify behaviors.

4) Code review & CI
   - Open a PR using `.github/PULL_REQUEST_TEMPLATE/default.md` and link the design doc issue.
   - Include the tests you wrote and ensure CI passes.

5) Staging
   - Deploy to staging and run smoke tests. Watch analytics and logs (supabase, hubspot webhooks) as appropriate.

Examples tailored to TradeMatey (pick one to implement as a template)
- Example 1 — Health-check endpoint (implemented)
   - Design doc: `docs/designs/health-check.md`.
   - Tests: `__tests__/api/health.test.ts` (tests-first added). The test imports a test-friendly `GET_RAW` export from the route.
   - Implementation: `src/app/api/internal/health/route.ts` — live at `/api/internal/health` and returns { status, services }.
   - Notes: CI step runs the health-check unit test first for fast feedback. See `.github/workflows/ci.yml`.

- Example 2 — Add analytics stub to `src/app/api/analytics/route.ts`
  - Design doc: describe fields to return (totalJobs, newUsers, completionRate).
  - Tests: mock DB and assert returned numbers.
  - Implementation: add route and hook it to `page.tsx` which already attempts to fetch `/api/analytics`.

How I can help next (concrete)
- I can implement Example 1 (health-check) or Example 2 (analytics stub) end-to-end: create the design doc issue, add tests-first, implement the route, run tests, and open a PR.

Runbook snippets (local)
- Install deps: (Windows PowerShell alternative) use cmd.exe to avoid execution policy issues:

```powershell
cmd /c "cd /d d:\Programming\projects\TradeMatey && npm install"
```

- Start dev server (background):

```powershell
Start-Process -NoNewWindow -FilePath 'cmd' -ArgumentList '/c cd /d d:\Programming\projects\TradeMatey && npm run dev'
```

- Run tests:

```powershell
cmd /c "cd /d d:\Programming\projects\TradeMatey && npm test"
```

Notes
- The app uses Supabase and NextAuth; when writing tests you should mock Supabase calls (see `service-worker-mock` and `jest.setup.js` in the repo) or use test fixtures for the DB.
- Keep PRs small and include tests-first artifacts to follow the repo workflow.
