---
story: S1
epic: 27 — Quality Assurance & Production Hardening
sprint: 7
priority: P0 — BLOCKS PRODUCTION LAUNCH
effort: 4 dev-days (8 story points)
dependencies: None — foundational
---

# Story S1: Test Infrastructure + Playwright E2E

## Scope
- [x] In Scope: Playwright install, 3 E2E tests, Vitest config, subscription gating unit tests
- [ ] Out of Scope: Performance testing, load testing, chaos testing

## Tasks

- [x] **S1.1** Install Playwright
  - `npm install -D @playwright/test`
  - `npx playwright install chromium`
  - Create `e2e/playwright.config.ts` (co-exist with `vitest.config.ts`)
  - Verify Chromium launchable in Docker container

- [x] **S1.2** E2E Test: Aspirant Journey
  ```
  test('onboarding → quiz → dashboard', async () => {
    await page.goto('/onboarding');
    // Complete diagnostic
    // Verify login → signup → dashboard
    // Verify daily plan visible
    // Click topic → topic viewer loads
    // Click quiz → submit → score visible
  });
  ```

- [x] **S1.3** E2E Test: Admin Scraper Pipeline
  ```
  test('admin triggers pipeline and sees results', async () => {
    await loginAsAdmin();
    await page.goto('/admin/scraper');
    await page.selectOption('select', 'pib');
    await page.click('button:has-text("Run")');
    await page.waitForSelector('pre');
    await expect(page.locator('pre')).toContainText('Scraped:');
  });
  ```
- [x] **S1.4** Vitest Unit Tests for Subscription Gating
  - `lib/subscription.ts` — `hasFeature()` returns correct booleans per tier
  - `lib/subscription.ts` — `getUserPlan()` falls back to 'free'
  - `lib/subscription.ts` — `canUseFeature()` blocks free users from premium features

- [x] `npx playwright test` runs all 3 E2E tests (chromium)
- [x] `npx vitest run` runs all subscription gating unit tests
- [x] No test failures in CI/CD pipeline
- [x] All tests pass in Docker container (Kali Linux)

## Definition of Done
- [x] Playwright CI config in GitHub Actions YAML
- [x] Test artifacts committed to repo
- [x] `npm run test:e2e` script in package.json
- [x] Screenshot artifacts on test failure
