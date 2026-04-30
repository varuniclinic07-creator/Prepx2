# Auth slice — production evidence (2026-04-30)

Target: `https://upsc.aimasteryedu.in` (Coolify build #6, commit `46ef0d7`, cloud Supabase `vbddpwxbijwuarmrexme`)

## Pre-checks

| Probe | Result |
|---|---|
| `GET /` | 200 (2.56s) |
| `GET /login` | 200 |
| `GET /api/health` | 200, body `{"ok":true,"checks":{"database":true}}` |

Build #6 is green and the app is wired to cloud Supabase.

## Auth-slice browser

| Test | Result | Note |
|---|---|---|
| B4: SSR sees session after login + reload | **PASS** | login → `/`, reload → `/onboarding` (expected, fresh user) |
| B5: logout in tab1 invalidates tab2 | **FAIL** | `/logout` returned **HTTP 500** → cookies not cleared |

Cookie dump (raw): `evidence/auth-slice-cookies-2026-04-30.json`. Final entry shows `b5_logoutStatus: 500`, one `sb-*` cookie still present after logout.

## Root cause

`app/logout/route.ts:6`:
```ts
const baseUrl = process.env.NEXT_PUBLIC_BASE_URL
if (!baseUrl) throw new Error('Missing NEXT_PUBLIC_BASE_URL')
```

The Coolify env-vars panel for the production app is missing `NEXT_PUBLIC_BASE_URL`. Same issue caused B5 to fail locally earlier in the day — was fixed in `.env.local` but never propagated to Coolify.

## Fix (user action)

1. Coolify dashboard → app → Environment Variables
2. Add: `NEXT_PUBLIC_BASE_URL=https://upsc.aimasteryedu.in`
3. Redeploy
4. Re-run: `AUTH_SLICE_APP_URL=https://upsc.aimasteryedu.in npm run test:auth-slice:browser`

Expected after fix: B4 + B5 both PASS, matching local results from earlier today.

## Status

Step 5 = **partially verified** — B4 green, B5 blocked on a one-line Coolify env-var add. Not a code defect.
