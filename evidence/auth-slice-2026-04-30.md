# Auth thin slice — full result — 2026-04-30

**Substrate gates:** PASS
- 044 remediation: 16/16
- Migration 045 (syllabus_tag + uuid-ossp): applied
- Migration 046 (handle_new_user trigger + backfill): applied
- HTTP slice: 11/11 PASS

**Browser slice (pre-fix):** B4 FAIL, B5 vacuous pass
**Browser slice (post-fix, A1 only):** B4 PASS, B5 timeout
**Browser slice (post-fix, A1 + logout):** B4 PASS (34.6s), B5 PASS (1.1m) — both verified

---

## Root cause (confirmed, fixed)

`lib/supabase.ts` used `@supabase/supabase-js` with `persistSession: true` which defaults to **localStorage** in browsers. Middleware uses `@supabase/ssr` which reads **cookies**. After login, the session existed in localStorage but was invisible to every server-rendered request.

### Fix applied

Migrated all 14 client-side files (`'use client'` components/pages) from:
```
import { supabase } from '@/lib/supabase'
```
to:
```
import { createClient } from '@/lib/supabase-browser'
```

`lib/supabase-browser.ts` uses `createBrowserClient` from `@supabase/ssr`, which writes the `sb-<ref>-auth-token` cookie that middleware reads.

**Files changed:**
- `app/login/page.tsx`
- `app/signup/page.tsx`
- `app/onboarding/page.tsx`
- `app/pricing/page.tsx`
- `app/battles/page.tsx`
- `app/battle-royale/page.tsx`
- `app/admin/quizzes/page.tsx`
- `app/admin/nudges/page.tsx`
- `app/admin/content/page.tsx`
- `app/admin/bot/page.tsx`
- `components/TopicViewer.tsx`
- `components/QuizComponent.tsx`
- `components/DailyPlan.tsx`
- `components/AnswerComposer.tsx`

`lib/supabase.ts` is preserved — its helper functions (getTopic, createWeakArea, etc.) are still used by server components and the module-level singleton. No client-side file imports the `supabase` singleton for auth anymore.

---

## Evidence — B4 (post-fix)

Source: `evidence/auth-slice-cookies-2026-04-30.json`

| Metric | Before fix | After fix |
|---|---|---|
| Cookies after login | 0 | 1 (`sb-supabase-auth-token`, 2401 bytes) |
| `b4_hasSsrCookieShape` | N/A | **true** |
| `b4_hasLegacyCookieShape` | N/A | **false** |
| `/admin` final URL | `/login` (FAIL) | `/` (PASS — middleware saw session, user is aspirant not admin) |
| After reload URL | N/A (test crashed) | `/` (PASS — session persisted) |
| B4 test result | **FAIL** | **PASS (42.5s)** |

### Cookie dump (post-fix)
```json
{
  "name": "sb-supabase-auth-token",
  "domain": "localhost",
  "path": "/",
  "httpOnly": false,
  "sameSite": "Lax",
  "valueLen": 2401,
  "valuePrefix": "base64-eyJhY2Nlc3NfdG9rZ"
}
```

---

## B5 status (logout multi-tab) — FIXED + VERIFIED

### Root cause (second bug)

`app/logout/route.ts` was using the cached `createClient` from `lib/supabase-server.ts`. That helper wraps `cookies()` from `next/headers` and writes inside a `try/catch` that swallows errors. In a route handler, cookie writes belong on the outgoing `NextResponse`, not the read-only `cookies()` store — so `signOut()` succeeded but its cookie clears were silently dropped.

### Fix

Rewrote `app/logout/route.ts` (and `app/auth/callback/route.ts` which had the same bug) to construct `createServerClient` inline with cookie callbacks bound to a `NextResponse`. Cookies now flow through to the response.

### Evidence (post-fix, 2026-04-30)

| Metric | Value |
|---|---|
| Cookies before logout | 1 (`sb-supabase-auth-token`, 2397 bytes) |
| `/logout` status | 302 |
| Cookies after logout | **0** |
| tab2 `/admin` post-logout | `/login` (PASS — middleware sees no session) |
| tab2 reload | `/login` (PASS — reload did not restore session) |
| B5 test result | **PASS (1.1m)** |

All three strict assertions hold:
1. cookies cleared from shared jar after logout
2. tab2 navigation to a protected route redirects to /login
3. tab2 reload does not restore the session

### Test fix (separate from logout fix)

`loginViaUi` was racing React hydration: native `<form>` GET-submit fired before the React `onSubmit` handler attached, sending the page to `/login?` and breaking the flow. Added `waitForLoadState('networkidle')` + a `waitForFunction` confirming the controlled-input value reflects what was typed (only true after hydration).

---

## Status per BMAD workflow

| Feature | Status |
|---|---|
| Auth signup + login (HTTP layer) | **verified** |
| Auth session persistence (browser → SSR) | **verified** |
| Auth logout invalidation (multi-tab) | **verified** (local) — needs production re-run |
| RLS enforcement (own-row vs cross-user) | **verified** |
| Token refresh cycle | **verified** |

---

## Files
- `scripts/verification/auth-slice-http.mjs` — HTTP probe (11/11)
- `e2e/auth-slice.spec.ts` — Playwright browser probe (B4 + B5)
- `e2e/playwright.auth-slice.config.ts` — config pointing at real Supabase
- `evidence/auth-slice-http-2026-04-29.json` — HTTP results
- `evidence/auth-slice-cookies-2026-04-30.json` — cookie dump (post-fix)
- `supabase/migrations/045_add_syllabus_tag_and_uuid_helpers.sql`
- `supabase/migrations/046_handle_new_user_trigger.sql`
