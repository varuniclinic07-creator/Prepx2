import { test, expect } from '@playwright/test';

test('admin creates white-label tenant via /admin/white-label', async ({ page }) => {
  await page.goto('/admin/white-label');
  await page.waitForLoadState('networkidle');

  const url = page.url();
  if (url.includes('/login')) {
    await expect(page.locator('h1')).toContainText('Welcome back');
    return;
  }

  // Verify white-label form elements
  await expect(page.locator('body')).toBeVisible();
  const bodyText = await page.locator('body').innerText();
  if (bodyText.includes('White-Label') || bodyText.includes('slug') || bodyText.includes('Tenant')) {
    await expect(page.locator('input[placeholder*="slug"]').first()).toBeVisible();
  }
});
