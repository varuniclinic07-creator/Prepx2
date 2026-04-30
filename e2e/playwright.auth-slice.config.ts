// Playwright config dedicated to the auth thin slice.
//
// Differs from playwright.config.ts:
//   - Runs ONLY auth-slice.spec.ts (testMatch)
//   - Uses REAL Supabase from process.env (loaded via --env-file=.env.local
//     when invoked from npm script)
//   - Sets NEXT_PUBLIC_BASE_URL so /logout doesn't throw
//   - reuseExistingServer so a long-running `npm run dev` is reused
import { defineConfig, devices } from '@playwright/test'

const PORT = process.env.AUTH_SLICE_PORT || '3000'
const BASE = `http://localhost:${PORT}`

export default defineConfig({
  testDir: './',
  testMatch: /auth-slice\.spec\.ts$/,
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  reporter: 'list',
  use: {
    baseURL: BASE,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: `npm run dev -- --port ${PORT}`,
    url: BASE,
    reuseExistingServer: true,
    timeout: 120_000,
    env: {
      NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL!,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY!,
      NEXT_PUBLIC_BASE_URL: BASE,
    },
  },
})
