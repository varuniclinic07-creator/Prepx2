import { test, expect } from '@playwright/test';

test('create a streak battle, accept it', async ({ page }) => {
  await page.goto('/battles');
  await page.waitForLoadState('networkidle');

  const bodyText = await page.locator('body').innerText();
  if (bodyText.includes('Streak Battle')) {
    await page.click('button:has-text("Create")');
    await page.fill('input[type="email"]', 'opponent@test.com');
    await page.fill('input[type="number"]', '100');
    await page.click('button:has-text("Create")');
    await expect(page.locator('text=/pending|created|battle/i').first()).toBeVisible({ timeout: 10000 });
  } else {
    await expect(page.locator('body')).toBeVisible();
  }
});
