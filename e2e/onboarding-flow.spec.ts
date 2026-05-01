import { test, expect } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY!
const APP_URL = process.env.AUTH_SLICE_APP_URL || 'http://localhost:3000'

test('full onboarding journey: signup -> diagnostic -> baseline persisted -> relogin lands on /', async ({ page, context }) => {
  test.setTimeout(180_000)
  const ts = Date.now()
  const email = `flow-${ts}@example.com`
  const password = `Pw_${ts}_secure!`

  // 1. Signup via service-role admin.createUser to bypass anon-key rate limits
  // and auto-confirm email (so the subsequent UI login works immediately).
  const admin = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } })
  const { data: signupData, error: signupErr } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  })
  expect(signupErr, 'signup should succeed').toBeNull()
  const userId = signupData.user!.id
  const { data: pre } = await admin.from('users').select('baseline_score').eq('id', userId).single()
  expect(pre?.baseline_score, 'fresh user should have null baseline').toBeNull()

  // 2. Login via UI to get session cookies
  await page.goto(`${APP_URL}/login`, { waitUntil: 'load' })
  await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {})
  await page.fill('input[type="email"]', email)
  await page.fill('input[type="password"]', password)
  await Promise.all([
    page.waitForURL(/\/(onboarding|)$/, { timeout: 30_000 }),
    page.click('button[type="submit"]'),
  ])

  // 3. Should land on /onboarding (baseline is null)
  await expect(page).toHaveURL(/\/onboarding/, { timeout: 15_000 })

  // 4. Pick language. The /onboarding page is a Client Component — wait for
  // hydration before clicking, otherwise the click event fires on a static
  // button with no React handler attached and `started` never flips to true.
  const englishBtn = page.getByRole('button', { name: 'English', exact: true })
  await englishBtn.waitFor({ state: 'visible' })
  await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {})
  // Retry-click until the diagnostic heading appears (handles flaky hydration)
  for (let attempt = 0; attempt < 3; attempt++) {
    await englishBtn.click()
    const ok = await page.getByRole('heading', { name: 'Diagnostic Quiz' })
      .waitFor({ state: 'visible', timeout: 5_000 })
      .then(() => true).catch(() => false)
    if (ok) break
  }

  // 5. Wait for diagnostic submit button (means full quiz UI rendered)
  const submitBtn = page.getByRole('button', { name: 'Submit Diagnostic' })
  await submitBtn.waitFor({ state: 'visible', timeout: 15_000 })

  // 6. Answer all 5 questions: pick first option in each question card
  // Each question heading is the question text inside a flex row; option buttons
  // sit in the sibling .space-y-2 div. Iterate by question id-stable index.
  for (let i = 0; i < 5; i++) {
    // Locate the i-th question card's option buttons (4 per card)
    const card = page.locator('div.bg-slate-900').nth(i)
    await card.getByRole('button').first().click()
  }

  // 7. Submit — button enables once all 5 answers are picked
  await expect(submitBtn).toBeEnabled({ timeout: 5_000 })
  await submitBtn.click()

  // 8. Wait for the post-submit screen. Either "Go to Dashboard" (success)
  // or "Save failed" (RLS / network) — both end the saving state.
  const goBtn = page.getByRole('button', { name: /Go to Dashboard|Save failed/ })
  await goBtn.waitFor({ state: 'visible', timeout: 30_000 })
  await expect(goBtn).toHaveText('Go to Dashboard', { timeout: 10_000 })
  // Onboarding's own save-error banner has red styling and visible text. A
  // generic empty role=alert from the Next.js error overlay can coexist —
  // assert on visible text, not raw count.
  const onboardErr = page.locator('[role="alert"]:visible').filter({ hasText: /Save failed|RLS|Not signed in|Network error/ })
  await expect(onboardErr, 'no onboarding save error should appear').toHaveCount(0)

  // 8. Verify DB persistence via service-role
  const { data: post } = await admin.from('users').select('baseline_score, preferred_language').eq('id', userId).single()
  expect(post?.baseline_score, 'baseline_score must persist').not.toBeNull()
  expect(typeof post?.baseline_score).toBe('number')
  expect(post?.preferred_language).toBe('en')

  // 10. Click "Go to Dashboard"
  await Promise.all([
    page.waitForURL(`${APP_URL}/`, { timeout: 30_000 }),
    goBtn.click(),
  ])
  await expect(page).toHaveURL(`${APP_URL}/`)

  // 11. Logout via the header "Log Out" button (form POST /logout).
  // Server clears the Supabase cookie and 302s to /. The dashboard at /
  // is a server component that calls redirect('/login') when no user, so
  // the browser ends up at /login.
  await page.getByRole('button', { name: /Log Out/i }).click()
  await page.waitForURL(/\/login(\?|$)/, { timeout: 20_000 })

  // 12. Re-login with same credentials — must go straight to / (not /onboarding)
  await page.fill('input[type="email"]', email)
  await page.fill('input[type="password"]', password)
  await Promise.all([
    page.waitForURL(/\/(?!onboarding|login)/, { timeout: 30_000 }),
    page.click('button[type="submit"]'),
  ])
  await expect(page, 'returning user must land on / not /onboarding').toHaveURL(`${APP_URL}/`)

  // Cleanup
  await admin.auth.admin.deleteUser(userId)
})
