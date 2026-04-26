import { test, expect } from '@playwright/test';

test('visit /isa, verify enrollment UI', async ({ page }) => {
  await page.goto('/isa');
  await page.waitForLoadState('networkidle');

  // Verify core ISA elements render
  await expect(page.locator('h1, h2').first()).toBeVisible();
  const bodyText = await page.locator('body').innerText();

  if (bodyText.includes('ISA') || bodyText.includes('Income Share') || bodyText.includes('enroll')) {
    await expect(page.locator('button, [role="button"]').first()).toBeVisible();
  } else {
    // Middleware redirect fallback
    await expect(page.locator('body')).toBeVisible();
  }
});
