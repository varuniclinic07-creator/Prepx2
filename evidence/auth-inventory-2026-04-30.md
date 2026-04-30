# Auth Surface Inventory — 2026-04-30

**Substrate gate:** PASS (16/16, exit 0, evidence/remediation-applied-2026-04-29.md).
**Mode:** read-only. No edits made during this pass. Drift findings logged, not reconciled.

---

## 1. Surfaces found

| # | Path | Library | Lifecycle | Notes |
|---|------|---------|-----------|-------|
| 1 | `middleware.ts` | `@supabase/ssr` (`createServerClient`) | **active and verified** | runs on every non-static request; calls `supabase.auth.getUser()` (validates + may refresh) |
| 2 | `lib/supabase-server.ts` | `@supabase/ssr` (`createServerClient`) | **active but unverified** | used by `app/auth/callback/route.ts`, `app/logout/route.ts`; React-cached per request |
| 3 | `lib/supabase-browser.ts` | `@supabase/ssr` (`createBrowserClient`) | **active but unverified** | exported `createClient()` — **zero known callers** in `app/` or `components/` (grep returns no results) |
| 4 | `lib/supabase.ts` | `@supabase/supabase-js` (`createClient`) | **duplicate auth path** | module-singleton; explicit `{ auth: { persistSession: true, autoRefreshToken: true } }`; used by `app/login/page.tsx`, `app/signup/page.tsx`, and ~all `lib/*.ts` business logic |
| 5 | `app/login/page.tsx` | imports #4 | **active and verified** (UI level) | calls `supabase.auth.signInWithPassword()`, then `window.location.href = '/'` |
| 6 | `app/signup/page.tsx` | imports #4 | **active and verified** (UI level) | calls `supabase.auth.signUp()` with `emailRedirectTo` → callback |
| 7 | `app/auth/callback/route.ts` | imports #2 | **active but unverified** | OAuth/magic-link code exchange via server client |
| 8 | `app/logout/route.ts` | imports #2 | **active but unverified** | `supabase.auth.signOut()`; **POST only**; redirects to `NEXT_PUBLIC_BASE_URL` (throws if missing) |

**Library generation check:** single generation. No `@supabase/auth-helpers-nextjs` anywhere in the tree. Mix is `@supabase/ssr` (modern) + `@supabase/supabase-js` (raw client used directly in browser code).

**Service-role usage in app code:** zero. Only present in `app/api/webhooks/razorpay/route.ts` and `app/api/webhooks/stripe/route.ts` — webhook signature verification, not user auth path. Confirms no service-role leakage into user flows.

**App router only:** no `pages/` directory found. No router coexistence.

---

## 2. Authority audit

| Surface | Refresh authority | Mutation authority (writes persisted session state) |
|---------|-------------------|----------------------------------------------------|
| `middleware.ts` (#1) | **YES** — `getUser()` validates + can trigger refresh; `setAll` writes both `request.cookies` and `res.cookies` | **YES** — writes auth cookies onto the response |
| `lib/supabase-server.ts` (#2) | **YES** — same `@supabase/ssr` server client, can refresh | **PARTIAL** — `setAll` is wrapped in `try/catch` and silently swallows errors (comment: "setAll called from Server Component without response context"); cookies only persist when invoked from a route handler with response context (callback, logout). When invoked from a Server Component, refreshed tokens are **dropped on the floor**. |
| `lib/supabase-browser.ts` (#3) | YES (default `autoRefreshToken: true`) | YES (writes browser cookies) — but **no callers**, so dormant |
| `lib/supabase.ts` (#4) | **YES** — `autoRefreshToken: true` explicit | YES — writes cookies via `@supabase/supabase-js` defaults; **lives parallel to the SSR cookie chain** |

### Authority conflicts (drift findings, not reconciled)

**FINDING-A1: Two competing client generations on the same browser session.**
The login/signup pages use `@supabase/supabase-js` (#4). Middleware uses `@supabase/ssr` (#1). These two libraries persist sessions to **different cookie shapes / storage keys**:
- `@supabase/supabase-js` defaults to `localStorage` (`sb-*-auth-token`) plus its own cookie format
- `@supabase/ssr` writes the canonical `sb-<ref>-auth-token.0`/`.1` chunked cookies that the server middleware reads

If the browser logs in via #4 and then makes a server-rendered request, **middleware (#1) may not see the session** unless #4 also wrote the SSR-shaped cookies. This is the classic "logged in client-side, logged out server-side" symptom.

**FINDING-A2: Server-Component refresh writes are silently dropped.**
`lib/supabase-server.ts` `setAll` swallows the "no response context" error (line 21-22). When a Server Component triggers a token refresh (e.g., calling `getUser()` on an expired access token), the new tokens are computed but never persisted. The next request will refresh again. Not fatal — middleware's refresh path *does* have response context — but it means refresh authority effectively concentrates in middleware, and Server Components that bypass middleware refresh in a vacuum.

**FINDING-A3: `lib/supabase-browser.ts` has zero callers.**
`createBrowserClient` is exported but never imported anywhere in `app/` or `components/`. It's a scaffold placeholder — written but unwired. The actual browser auth path is #4 (`lib/supabase.ts`).

**FINDING-A4: No cookie hydration in route handlers via #4.**
`lib/supabase.ts` is a module-level singleton instantiated at import time with no per-request cookie context. Any business-logic function that calls it (e.g. `getUserProfile`, `createDailyPlan`) runs as **anon** server-side — they never see the requesting user's JWT. This is observable in the schema: those functions return data via RLS-as-anon, which means many of them likely return `null` for authenticated-only data unless they're called from the browser.

---

## 3. Failure-pattern probe results

| # | Pattern | Status | Notes |
|---|---------|--------|-------|
| 1 | `onAuthStateChange` listeners triggering router refreshes (recursive risk) | **NO** | grep returns zero `onAuthStateChange` usages anywhere in `app/`, `components/`, `lib/` |
| 2 | Middleware refreshes on every request vs only on expired tokens | **EVERY REQUEST** | `getUser()` runs on every non-static request, including non-admin paths. The SSR client only writes cookies if a refresh actually happened, but the validation call itself is unconditional. Acceptable, not optimal |
| 3 | Browser client auto-refresh racing middleware-issued cookies | **YES (likely)** | `lib/supabase.ts` has `autoRefreshToken: true`; middleware also refreshes. Two refresh authorities on the same session is the FINDING-A1 substrate |
| 4 | Server actions / route handlers without cookie hydration | **YES** | `lib/supabase.ts` singleton is reused from `lib/agents/hermes.ts`, `lib/battle-royale.ts`, `lib/coins.ts`, `lib/rank-oracle.ts`, `lib/realtime.ts` — all server-side, all anon-context |
| 5 | Route handlers using service-role accidentally | **NO** | service-role only in webhooks; no user-flow leakage |
| 6 | Auth state read inconsistently from cookies + localStorage | **YES (likely)** | `@supabase/supabase-js` defaults to localStorage; `@supabase/ssr` is cookies-only; mixed clients = mixed sources |

---

## 4. Supabase SDK defaults capture

| Client | `autoRefreshToken` | `persistSession` | `detectSessionInUrl` | `onAuthStateChange` listeners |
|--------|--------------------|--------------------|------------------------|---------------------------------|
| middleware (#1, `@supabase/ssr` server) | n/a — server clients don't auto-refresh on a timer; they refresh on `getUser()` validation | n/a — uses request/response cookies | n/a | none registered |
| `lib/supabase-server.ts` (#2, `@supabase/ssr` server) | same as above | same — uses Next `cookies()` | n/a | none |
| `lib/supabase-browser.ts` (#3, `@supabase/ssr` browser) | default **true** | default **true** | default **true** | none registered (and no callers) |
| `lib/supabase.ts` (#4, `@supabase/supabase-js`) | **true** (explicit) | **true** (explicit) | default **true** | none registered |

---

## 5. Source of truth

**Observable runtime authority (not inferred):**

- **For `app/login/page.tsx` and `app/signup/page.tsx` flows** → `lib/supabase.ts` (#4) is canonical. It writes the cookies that exist after login.
- **For middleware-protected routes (e.g. `/admin/*`)** → `middleware.ts` (#1) reads cookies. If #4's cookies don't match #1's expected format, the user appears logged out server-side.
- **For OAuth callback + logout** → `lib/supabase-server.ts` (#2) is canonical because it's the only one with response cookie context in those routes.
- **For Server Components** → no clean authority. Either #2 (cookie writes silently dropped on refresh) or #4 (anon singleton, no user context). Most Server Components in this codebase appear to delegate auth to middleware-checked-already or skip auth entirely.

The dominant runtime path is #4, not #3 — confirming the spec's rule against assuming "newer = canonical." The `@supabase/ssr` browser client is the modern recommendation but **is dormant**; the legacy raw client is doing the actual work.

---

## 6. Tasks for the auth slice (next phase)

The thin slice will exercise these specific behaviors, with evidence captured (cookies, headers, redirect chains):

| # | Behavior | Pass condition |
|---|----------|----------------|
| 1 | Signup → email confirm → first signin | Real JWT in browser cookies; `users` row created |
| 2 | Authenticated SELECT from `users` (own row) | 200 + own row only |
| 3 | Authorization isolation: userA cannot read userB's row | 200 + empty array (RLS) |
| 4 | Reload protected page after login | Session survives full page reload (SSR sees the session) |
| 5 | Multi-tab logout invalidation | Logout in tab1 → tab2's next protected fetch fails |
| 6a | Stale access token + valid refresh | Middleware refreshes; new Set-Cookie; no redirect loop |
| 6b | Invalid access + invalid refresh | Redirect to /login; cookies cleared; no infinite refresh |

The cookie-shape mismatch in **FINDING-A1** is the most likely behavior to break #4 (reload). This is exactly what the slice is designed to surface.

---

## 7. Deferred (not part of slice)

- Time-skew tolerance (clock drift) — post-slice hardening
- Consolidating #3 vs #4 vs picking one canonical browser client — only triggered by an observed slice failure
- Migrating `lib/supabase.ts` to `@supabase/ssr` — only triggered by an observed slice failure
- Eliminating module-singleton anon usage in `lib/*.ts` — same rule

---

## 8. Read-only confirmation

No files were edited during this inventory. The probe artifact (`evidence/remediation-applied-2026-04-29.md`) is the only state change and predates this phase. Drift findings A1–A4 are recorded for the slice phase to confirm or refute against real browser behavior.
