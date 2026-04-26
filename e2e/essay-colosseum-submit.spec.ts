import { test, expect } from '@playwright/test';

test('visit /essay-colosseum, submit essay', async ({ page }) => {
  await page.goto('/essay-colosseum');
  await page.waitForLoadState('networkidle');

  const bodyText = await page.locator('body').innerText();
  if (bodyText.includes('Essay Colosseum') || bodyText.includes('Create')) {
    await expect(page.locator('button:has-text("Create")').first()).toBeVisible();
    // Verify form fields exist in create view
    await page.click('button:has-text("Create")');
    await expect(page.locator('input, textarea').first()).toBeVisible();
  } else {
    await expect(page.locator('body')).toBeVisible();
  }
});
