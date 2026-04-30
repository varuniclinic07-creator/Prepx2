// Auth thin slice — browser layer (B4 + B5).
//
// Captures evidence the HTTP probe can't reach:
//   B4  SSR reload after login: does middleware see the session?
//       (FINDING-A1: lib/supabase.ts uses @supabase/supabase-js whose cookie
//       shape may not match what middleware's @supabase/ssr expects)
//   B5  Multi-tab logout: does signing out in one tab invalidate another?
//
// Cookies are dumped to evidence/auth-slice-cookies-<date>.json so we can
// compare what the browser writes vs. what middleware reads.

import { test, expect, type BrowserContext, type Page } from '@playwright/test'
import { writeFileSync, mkdirSync } from 'node:fs'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY!
const APP_URL = process.env.AUTH_SLICE_APP_URL || 'http://localhost:3000'

if (!SUPABASE_URL || !SERVICE_ROLE) {
  throw new Error('NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set')
}

const RUN_AT = new Date().toISOString()
const evidence: Record<string, unknown> = { runAt: RUN_AT, supabaseUrl: SUPABASE_URL, appUrl: APP_URL }

async function adminCreateConfirmed(email: string, password: string): Promise<string> {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
    method: 'POST',
    headers: {
      apikey: SERVICE_ROLE,
      Authorization: `Bearer ${SERVICE_ROLE}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, password, email_confirm: true }),
  })
  const body = await res.json()
  if (!res.ok || !body.id) throw new Error(`admin create failed: ${res.status} ${JSON.stringify(body)}`)
  return body.id as string
}

async function adminDeleteUser(userId: string) {
  await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${userId}`, {
    method: 'DELETE',
    headers: { apikey: SERVICE_ROLE, Authorization: `Bearer ${SERVICE_ROLE}` },
  }).catch(() => {})
}

async function loginViaUi(page: Page, email: string, password: string) {
  await page.goto(`${APP_URL}/login`, { waitUntil: 'load' })
  // Wait for React hydration before interacting. Without this, native
  // <form> GET-submit can fire before the React onSubmit handler is
  // attached, sending the page to /login? and breaking the flow.
  // The 'load' waitUntil above + networkidle below gives Next/React
  // time to hydrate the client component.
  await page.waitForLoadState('networkidle', { timeout: 60_000 }).catch(() => {})
  // Belt-and-braces: wait until typing into the input is reflected,
  // which only happens once React's controlled-input handler is bound.
  await page.fill('input[type="email"]', email)
  await page.waitForFunction(
    (expected) => (document.querySelector('input[type="email"]') as HTMLInputElement | null)?.value === expected,
    email,
    { timeout: 30_000 }
  )
  await page.fill('input[type="password"]', password)
  // Login redirects via window.location.href = '/' on success.
  await Promise.all([
    page.waitForURL(`${APP_URL}/`, { timeout: 60_000, waitUntil: 'commit' }),
    page.click('button[type="submit"]'),
  ])
}

async function dumpCookies(context: BrowserContext, label: string) {
  const cookies = await context.cookies()
  const supaCookies = cookies.filter(c => c.name.startsWith('sb-') || c.name.includes('supabase'))
  evidence[`cookies_${label}`] = supaCookies.map(c => ({
    name: c.name,
    domain: c.domain,
    path: c.path,
    httpOnly: c.httpOnly,
    sameSite: c.sameSite,
    valueLen: c.value.length,
    valuePrefix: c.value.slice(0, 24),
  }))
  return supaCookies
}

test.afterAll(async () => {
  mkdirSync('evidence', { recursive: true })
  const date = RUN_AT.slice(0, 10)
  writeFileSync(`evidence/auth-slice-cookies-${date}.json`, JSON.stringify(evidence, null, 2))
})

test.describe('Auth slice — browser', () => {
  let userAEmail: string
  let userAPassword: string
  let userAId: string

  test.beforeAll(async () => {
    userAEmail = `slice-pw-${Date.now()}@example.com`
    userAPassword = 'TestPass123!playwright'
    userAId = await adminCreateConfirmed(userAEmail, userAPassword)
    evidence.userAId = userAId
    evidence.userAEmail = userAEmail
  })

  test.afterAll(async () => {
    if (userAId) await adminDeleteUser(userAId)
  })

  test('B4: SSR sees session after login + full reload', async ({ context, page }) => {
    test.setTimeout(180_000) // dev-mode cold compile of /login + /admin can be slow

    await loginViaUi(page, userAEmail, userAPassword)

    const cookiesAfterLogin = await dumpCookies(context, 'after_login')
    evidence.b4_cookieCountAfterLogin = cookiesAfterLogin.length

    // Capture which cookie families exist. The SSR middleware reads
    // sb-<ref>-auth-token chunked cookies; the legacy supabase-js writes
    // sb-<ref>-auth-token (single) plus localStorage. If only the legacy
    // shape exists, middleware will not see the session on a server-rendered
    // request and SSR will treat the user as anonymous.
    const ssrShape = cookiesAfterLogin.some(c => /^sb-.*-auth-token(\.\d+)?$/.test(c.name))
    const legacyShape = cookiesAfterLogin.some(c => c.name.startsWith('sb-') && !/-auth-token(\.\d+)?$/.test(c.name))
    evidence.b4_hasSsrCookieShape = ssrShape
    evidence.b4_hasLegacyCookieShape = legacyShape

    // Hit a protected route via full server-rendered navigation. /admin is
    // middleware-protected (redirects to /login if no session, then to / if
    // role!=admin). We want to confirm the middleware AT LEAST recognizes
    // the user (does NOT redirect to /login). A redirect to / with role=aspirant
    // is a passing signal — it means middleware saw the session.
    const adminResp = await page.goto(`${APP_URL}/admin`, { waitUntil: 'domcontentloaded' })
    const finalUrl = page.url()
    evidence.b4_adminFetchStatus = adminResp?.status()
    evidence.b4_adminFinalUrl = finalUrl

    // Pass condition: middleware did NOT redirect to /login.
    // (Redirect to / is fine — the user just isn't admin; the auth check passed.)
    expect(finalUrl, 'middleware redirected to /login → SSR did not see session (FINDING-A1)').not.toContain('/login')

    // Reload the page. Session must survive a full reload.
    await page.reload({ waitUntil: 'domcontentloaded' })
    const afterReload = page.url()
    evidence.b4_afterReloadUrl = afterReload
    expect(afterReload, 'after reload, ended up at /login → SSR session not persisted').not.toContain('/login')
  })

  test('B5: logout in tab1 invalidates tab2', async ({ browser }) => {
    test.setTimeout(180_000) // dev-mode cold compile of /admin can be slow

    // Two pages in the SAME context = shared cookie jar + shared localStorage.
    // logout in tab1 must invalidate tab2's server-rendered fetch.
    const context = await browser.newContext()
    try {
      const tab1 = await context.newPage()
      const tab2 = await context.newPage()

      await loginViaUi(tab1, userAEmail, userAPassword)

      // Warm /admin in tab2 BEFORE logout so the post-logout navigation
      // measures auth state, not Next dev compile time.
      await tab2.goto(`${APP_URL}/admin`, { waitUntil: 'domcontentloaded' })
      const tab2BeforeLogout = tab2.url()
      evidence.b5_tab2BeforeLogoutUrl = tab2BeforeLogout
      // Pre-condition: tab2 is authenticated (middleware did NOT redirect to /login)
      expect(tab2BeforeLogout, 'pre-condition: tab2 should be authenticated before logout').not.toContain('/login')

      const cookiesBeforeLogout = await dumpCookies(context, 'before_logout')
      evidence.b5_cookieCountBeforeLogout = cookiesBeforeLogout.length

      // Trigger server-side logout. /logout is POST-only and redirects.
      const logoutResp = await tab1.request.post(`${APP_URL}/logout`, { maxRedirects: 0 }).catch(e => e)
      evidence.b5_logoutStatus = logoutResp?.status?.()

      const cookiesAfterLogout = await dumpCookies(context, 'after_logout')
      evidence.b5_cookieCountAfterLogout = cookiesAfterLogout.length

      // (1) cookies cleared from shared jar
      expect(cookiesAfterLogout.length, 'sb-* cookies still present after logout → server did not clear cookies').toBe(0)

      // (2) tab2 navigation to a protected route now redirects to /login
      await tab2.goto(`${APP_URL}/admin`, { waitUntil: 'domcontentloaded' })
      const tab2Final = tab2.url()
      evidence.b5_tab2FinalUrl = tab2Final
      expect(tab2Final, 'tab2 still authenticated after tab1 logged out → middleware sees stale session').toContain('/login')

      // (3) Refresh tab2 — session must NOT be restored
      await tab2.reload({ waitUntil: 'domcontentloaded' })
      const tab2AfterReload = tab2.url()
      evidence.b5_tab2AfterReloadUrl = tab2AfterReload
      expect(tab2AfterReload, 'reload restored a session → cookies were not actually cleared').toContain('/login')
    } finally {
      await context.close()
    }
  })
})
