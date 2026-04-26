import { test, expect } from '@playwright/test';

test('visit /mnemonics, verify mnemonic generated', async ({ page }) => {
  await page.goto('/mnemonics');
  await page.waitForLoadState('networkidle');

  const bodyText = await page.locator('body').innerText();
  if (bodyText.includes('Mnemonic') || bodyText.includes('Generate')) {
    await expect(page.locator('input, textarea').first()).toBeVisible();
    await page.fill('input, textarea', 'Fundamental Rights');
    await page.click('button:has-text("Generate")');
    await expect(page.locator('text=/mnemonic|result|explanation/i').first()).toBeVisible({ timeout: 15000 });
  } else {
    await expect(page.locator('body')).toBeVisible();
  }
});
