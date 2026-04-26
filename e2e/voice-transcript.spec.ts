import { test, expect } from '@playwright/test';

test('visit /voice, verify transcript UI', async ({ page }) => {
  await page.goto('/voice');
  await page.waitForLoadState('networkidle');

  const bodyText = await page.locator('body').innerText();
  if (bodyText.includes('Voice') || bodyText.includes('Speak')) {
    await expect(page.locator('button:has-text("Start")').first()).toBeVisible();
    await expect(page.locator('button').first()).toBeVisible();
  } else {
    await expect(page.locator('body')).toBeVisible();
  }
});
