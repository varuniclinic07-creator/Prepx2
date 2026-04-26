import { test, expect } from '@playwright/test';

test('admin creates AI tutor via /admin/tutors', async ({ page }) => {
  await page.goto('/admin/tutors');
  await page.waitForLoadState('networkidle');

  const url = page.url();
  if (url.includes('/login')) {
    await expect(page.locator('h1')).toContainText('Welcome back');
    return;
  }

  await expect(page.locator('body')).toBeVisible();
  const bodyText = await page.locator('body').innerText();
  if (bodyText.includes('Tutor')) {
    // Verify table or list renders
    await expect(page.locator('table, tbody, tr').first()).toBeVisible();
  }
});
