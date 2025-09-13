E2E run and CI secrets

Required repository secrets (GitHub Actions):
- TEST_SEED_TOKEN: token used by the guarded /api/test-seed endpoint. CI uses this to seed deterministic E2E data.
- STRIPE_SECRET_KEY (optional): only needed if you want the seed endpoint to create a real Stripe test customer/payment method.
- SENTRY_DSN (optional): set this to enable Sentry forwarding from server logs.

Local quick steps (Windows PowerShell):

```powershell
# install deps
npm ci
# install playwright browsers (one-off)
npx playwright install --with-deps
# set seed token env var (replace token)
$env:TEST_SEED_TOKEN = 'your-local-token'
# start dev server
npm run dev
# in another shell, seed test data
curl -X POST -H "x-test-seed-token: $env:TEST_SEED_TOKEN" http://localhost:3000/api/test-seed
# run playwright tests
npx playwright test
```

Or use the convenience script (will install browsers, start dev server, seed, and run tests):

```powershell
npm run e2e:local
```

Notes:
- The seed endpoint is forbidden when NODE_ENV=production. Use a disposable dev/staging environment for CI.
- If you want fully end-to-end payments with Stripe, provide STRIPE_SECRET_KEY to CI and the seed endpoint will create a test customer and attach a test card (4242...). If you prefer not to use Stripe in CI, keep payments mocked in E2E.
