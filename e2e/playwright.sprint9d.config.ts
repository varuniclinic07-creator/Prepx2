// Sprint 9-D Phase D — Playwright config that talks to a REAL Next dev
// server + REAL Supabase project (creds via .env.local through dotenv-cli).
// Unlike playwright.config.ts, this one does NOT spawn its own webServer
// nor override env to dummy values — it reuses whatever's running on
// NEXT_PUBLIC_BASE_URL (default http://localhost:3000).

import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './',
  testMatch: /sprint9d-learn-ui\.spec\.ts$/,
  fullyParallel: false,
  retries: 0,
  workers: 1,
  reporter: 'list',
  use: {
    baseURL: process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
