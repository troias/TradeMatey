import { test, expect, APIRequestContext, Page } from '@playwright/test';

// This test seeds data via a protected API endpoint, then exercises the accept -> assign -> pay flow.
test('accept assigns milestones and enables payment', async ({ page, request }: { page: Page; request: APIRequestContext }) => {
  // call seed endpoint
  const token = process.env.TEST_SEED_TOKEN || 'test-seed-token';
  const seedResp = await request.post('http://localhost:3000/api/test-seed', { headers: { 'x-test-seed-token': token } });
  const seed = await seedResp.json();
  if (!seedResp.ok) throw new Error('Seed failed: ' + JSON.stringify(seed));

  // Navigate to job page for the seeded job
  // Ensure subsequent browser requests include the seed token so server
  // endpoints treat the browser as the seeded client. Also inject a
  // lightweight client-side identity so client-only checks pass.
  await page.context().setExtraHTTPHeaders({ 'x-test-seed-token': token });
  await page.addInitScript(() => {
    // @ts-expect-error test-only global
    (window as any).__E2E_AUTH = { userId: 'seed_client_001' };
  });
  await page.goto('/client/job/seeded-job-001');

  // Click accept on the first interested tradie
  // Click Accept. The client-side accept call will include the header from
  // the browser context and the server will accept the request as the
  // seeded client.
  await page.click('button:has-text("Accept")');

  // Wait for success toast or UI change
  await page.waitForTimeout(500);

  // Navigate to the first milestone
  await page.click('a:has-text("phase 1")');

  // Verify assigned tradie section shows assigned tradie
  await expect(page.locator('text=Assigned tradie:')).toBeVisible();

  // Verify Pay button exists
  await expect(page.locator('button:has-text("Pay A$")')).toBeVisible();
});
