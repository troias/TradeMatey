# Testing and CI

This document explains how to run the project's unit tests, the lightweight integration tests, and the Playwright E2E scaffold locally.

Prerequisites
- Node 18+ (LTS)
- npm

Unit tests (Jest)

- Install dependencies:

```bash
npm ci
```

- Run full test suite:

```bash
npm test -- --runInBand
```

- Run a single test file:

```bash
npx jest __tests__/components/IntegratedMilestonePage.test.tsx -i --runInBand
```

Playwright E2E (scaffold)

The repository includes a Playwright scaffold in `playwright.config.ts` and a sample test in `e2e/accept-assign-pay.spec.ts`.

To run E2E locally:

1. Start the dev server (the tests assume `http://localhost:3000`):

```powershell
npm run dev
```

2. Run Playwright tests (install Playwright first):

```bash
npm i -D @playwright/test
npx playwright install
npx playwright test e2e/accept-assign-pay.spec.ts
```

Notes:
- The E2E test uses seeded data and expects a specific job/tradie IDs; adapt the test or seed data accordingly for your environment.
- CI runs the Jest suites via the workflow in `.github/workflows/ci.yml` and includes linting and type checking steps.

Contributing: testing patterns
- Prefer small, isolated tests that mock external services (Supabase, Stripe). Use chainable mocks for Supabase calls.
- For UI integration tests, mock heavy UI modules (design system) to keep tests fast and deterministic.
- Add new tests under `__tests__/` and keep them small; full E2E goes under `e2e/` and requires a running server.
