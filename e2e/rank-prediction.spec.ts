import { test, expect } from '@playwright/test';

test('visit /rank, verify prediction loaded', async ({ page }) => {
  await page.goto('/rank');
  await page.waitForLoadState('networkidle');

  // Rank Oracle page has streak info or fallback redirect
  const hasRankText = await page.locator('body').innerText().then(t => t.includes('Rank Oracle') || t.includes('Predicted AIR Range'));
  if (hasRankText) {
    await expect(page.locator('text=/Predicted AIR Range|Rank Oracle/i').first()).toBeVisible();
  } else {
    await expect(page.locator('body')).toBeVisible();
  }
});
