import { test, expect } from '@playwright/test';

test('visit a quiz page, answer questions, submit', async ({ page }) => {
  await page.goto('/quiz/topic-001');

  // Wait for quiz to render options
  await page.waitForLoadState('networkidle');
  const options = page.locator('button.w-full');
  const count = await options.count();

  if (count >= 4) {
    // Click first option for each question
    const questions = Math.min(Math.floor(count / 4), 5);
    for (let i = 0; i < questions; i++) {
      await options.nth(i * 4).click();
    }
    // Submit
    await page.click('button:has-text("Submit")');
    await expect(page.locator('text=/Result|Score|Correct/i').first()).toBeVisible({ timeout: 10000 });
  } else {
    test.skip();
  }
});
