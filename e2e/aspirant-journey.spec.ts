import { test, expect } from '@playwright/test';

test('onboarding → quiz → dashboard', async ({ page }) => {
  // Navigate to onboarding
  await page.goto('/onboarding');
  // Language gate: choose English before Diagnostic Quiz appears
  await expect(page.locator('text=Study in English or Hindi?')).toBeVisible();
  await page.click('button:has-text("English")');
  await expect(page.locator('text=Diagnostic Quiz')).toBeVisible();
  // Answer all 5 questions by clicking first option in each block
  for (let i = 1; i <= 5; i++) {
    const buttons = page.locator('button.w-full');
    await buttons.nth((i - 1) * 4).click();
  }

  // Submit diagnostic
  await page.click('button:has-text("Submit Diagnostic")');
  await expect(page.locator('text=Go to Dashboard')).toBeVisible();

  // Verify score visible
  await expect(page.locator('text=/\\d+ \/ 5/')).toBeVisible();

  // Navigate to dashboard
  await page.click('button:has-text("Go to Dashboard")');
  await expect(page).toHaveURL('/');

  // Verify dashboard visible
  await expect(page.locator('h1, h2, [class*="Daily"]').first()).toBeVisible();
});
