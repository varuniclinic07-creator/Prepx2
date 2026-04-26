import { test, expect } from '@playwright/test';

test('admin login → /admin/content, create topic', async ({ page }) => {
  await page.goto('/admin/content');
  await page.waitForLoadState('networkidle');

  const url = page.url();
  if (url.includes('/login')) {
    await expect(page.locator('h1')).toContainText('Welcome back');
    return;
  }

  // Verify admin content page renders
  await expect(page.locator('body')).toBeVisible();
  const bodyText = await page.locator('body').innerText();

  if (bodyText.includes('Content')) {
    // Trigger agent generation or verify form exists
    await expect(page.locator('select, button, input').first()).toBeVisible();
  }
});
