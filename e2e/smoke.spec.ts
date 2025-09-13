import { test, expect } from '@playwright/test';

test('browse -> open tradie profile', async ({ page }) => {
  const base = process.env.E2E_BASE_URL || 'http://localhost:3001';
  await page.goto(`${base}/client/browse-tradies`);
  // wait for cards to show up
  await page.waitForSelector('text=Browse Tradies');
  const firstCard = page.locator('article, div').filter({ hasText: 'EXPERT' }).first();
  await expect(firstCard).toBeVisible({ timeout: 5000 });
  // Click the first clickable link inside the card
  const link = firstCard.locator('a').first();
  await link.click();
  // Expect the profile page to load with 'Offer job' CTA
  await page.waitForSelector('text=Offer job', { timeout: 5000 });
  await expect(page.locator('text=Offer job')).toBeVisible();
});
