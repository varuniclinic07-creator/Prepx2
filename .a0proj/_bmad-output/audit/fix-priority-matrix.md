# PrepX Fix Priority Matrix

**Auditor:** Wendy (BMAD Workflow Building Master)
**Date:** 2026-04-26
**Methodology:** Impact × Effort scoring. Highest impact for lowest effort ranked first. Each fix has owner (Backend/Frontend/Database/DevOps/QA), estimated scope, and acceptance criteria.

---

## Legend

| Impact | Description |
|--------|-------------|
| 🔴 Critical | Security breach, revenue loss, data corruption, or complete feature failure |
| 🟠 High | Major UX degradation, business logic failure, or compliance risk |
| 🟡 Medium | Performance issue, missing feature, or maintainability debt |
| 🟢 Low | Polish, documentation, or minor inconsistency |

| Effort | Description |
|--------|-------------|
| S | Single file, <1 hour |
| M | Cross-file, 1-4 hours |
| L | Architecture change, 4-8 hours |
| XL | Multi-system, 1-2 days |

---

## Phase 1: Stop The Bleeding (Do First — P0)

| Rank | Fix | Impact | Effort | Owner | Files | Acceptance Criteria |
|------|-----|--------|--------|-------|-------|---------------------|
| 1.1 | **Add auth check to `api/payments/razorpay`** | 🔴 Critical | S | Backend | `app/api/payments/razorpay/route.ts` | `req.user.id` verified against `supabase.auth.getUser()` before any order creation; returns 401 if unauthenticated |
| 1.2 | **Add Stripe webhook signature verification** | 🔴 Critical | S | Backend | `app/api/webhooks/stripe/route.ts` | Uses `stripe.webhooks.constructEvent(req.body, sig, secret)`; returns 400 on invalid signature; no TODOs remain |
| 1.3 | **Add auth to `api/mains/evaluate`** | 🔴 Critical | S | Backend | `app/api/mains/evaluate/route.ts` | `supabase.auth.getUser()` guards entry; remove `user_id` from body; use `user.id` instead; returns 401 if unauthenticated |
| 1.4 | **Remove Razorpay dummy fallbacks** | 🔴 Critical | S | Backend | `app/api/payments/razorpay/route.ts`, `app/api/tutors/hire/route.ts`, `app/api/isa/payment/route.ts` | All `rzp_test_dummy` and `dummy_secret` strings removed; routes throw 500 if env vars missing instead of using test credentials |
| 1.5 | **Delete or auth-gate `api/test-ai`** | 🔴 Critical | S | Backend | `app/api/test-ai/route.ts` | Route either requires admin role or is deleted entirely; no public AI credit burn endpoint remains |
| 1.6 | **Add auth to `api/astra/generate`** | 🔴 Critical | S | Backend | `app/api/astra/generate/route.ts` | `getUser()` check added; unauthenticated callers blocked with 401 |
| 1.7 | **Add auth to `api/mnemonics/generate`** | 🔴 Critical | S | Backend | `app/api/mnemonics/generate/route.ts` | `getUser()` check added; unauthenticated callers blocked with 401 |
| 1.8 | **Add auth to `api/scrape/run`** | 🔴 Critical | S | Backend | `app/api/scrape/run/route.ts` | Admin role check added; unauthenticated or non-admin callers blocked with 403 |
| 1.9 | **Fix `webhooks/razorpay` timingSafeEqual** | 🔴 Critical | S | Backend | `app/api/webhooks/razorpay/route.ts` | `timingSafeEqual` wrapped in try-catch; buffer length mismatch handled gracefully with 400 |
| 1.10 | **Add RLS to `topics`, `quizzes`, `squads`, `squad_members`, `user_cohorts`** | 🔴 Critical | M | Database | `supabase/schema.sql` | Each table has `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` and appropriate policies; no table remains exposed |

**Phase 1 Completion Gate:** All P0 security holes patched. Run `curl` smoke tests against each route to verify 401/403 responses for unauthenticated requests.

---

## Phase 2: Harden & Validate (Do Next — P1)

| Rank | Fix | Impact | Effort | Owner | Files | Acceptance Criteria |
|------|-----|--------|--------|-------|-------|---------------------|
| 2.1 | **Add Zod validation to all API routes** | 🟠 High | L | Backend | All `app/api/**/route.ts` | Every route uses Zod schema to validate `req.json()`; invalid input returns 400 with field-level errors; no `req.json()` remains unwrapped |
| 2.2 | **Add try/catch to routes missing error handling** | 🟠 High | M | Backend | `app/api/battles/accept/route.ts`, `app/api/battles/create/route.ts`, `app/api/daily-plan/**/route.ts`, `app/api/isa/**/route.ts`, `app/api/predictions/route.ts`, `app/api/spatial/topics/route.ts`, `app/api/tutors/create/route.ts`, `app/api/tutors/hire/route.ts`, `app/api/white-label/**/route.ts` | Every route has try/catch; unexpected errors return JSON `{error: string}` with 500 status; no unhandled exceptions crash the server |
| 2.3 | **Add rate limiting middleware** | 🟠 High | L | Backend | `middleware.ts` or new `lib/rate-limit.ts` | Upstash Redis rate limiter applied to all API routes; 100 req/min for AI endpoints, 30 req/min for payments, 1000 req/min for general |
| 2.4 | **Fix IDOR on `api/rank/predict`** | 🟠 High | S | Backend | `app/api/rank/predict/route.ts` | `body.user_id` verified against `user.id`; reject with 403 if mismatched |
| 2.5 | **Fix IDOR on `api/essay-colosseum/submit`** | 🟠 High | S | Backend | `app/api/essay-colosseum/submit/route.ts` | Verify `user_id` is `initiator_id` or `opponent_id` in match; reject with 403 if unauthorized |
| 2.6 | **Fix IDOR on `api/essay-colosseum/accept`** | 🟠 High | S | Backend | `app/api/essay-colosseum/accept/route.ts` | Verify match ownership or invitation; reject unauthorized with 403 |
| 2.7 | **Add admin role re-check to admin API routes** | 🟠 High | M | Backend | `app/api/isa/list/route.ts`, `app/api/white-label/tenants/route.ts`, `app/api/dhwani/generate/route.ts`, `app/api/battle-royale/route.ts` | Every admin API re-queries `users.role` from DB and rejects non-admin with 403; no reliance on middleware-only gating |
| 2.8 | **Fix duplicate index names in schema** | 🟠 High | S | Database | `supabase/schema.sql` | `idx_notifications_user_read` renamed uniquely per table; `idx_battle_participants_user` deduplicated; schema applies without error on fresh DB |
| 2.9 | **Add DELETE capability to admin pages** | 🟠 High | M | Frontend + Backend | `app/admin/content/page.tsx`, `app/admin/quizzes/page.tsx`, `app/admin/nudges/page.tsx`, `app/admin/tutors/page.tsx`, `app/admin/white-label/page.tsx` | Each admin page has a red "Delete" button with confirmation modal; calls DELETE API that hard-deletes or soft-deletes record; UI refreshes |
| 2.10 | **Remove `process.env` leakage from `/admin/ai-providers`** | 🟠 High | S | Frontend | `app/admin/ai-providers/page.tsx` | No `NEXT_PUBLIC_*` or `§§secret()` strings rendered to DOM; use server-side API to mask provider details |
| 2.11 | **Add input length caps to LLM routes** | 🟠 High | S | Backend | `app/api/mains/evaluate/route.ts`, `app/api/interview/evaluate/route.ts`, `app/api/mnemonics/generate/route.ts`, `app/api/essay-colosseum/submit/route.ts`, `app/api/astra/generate/route.ts` | All user-input fields capped at 10,000 chars; reject with 413 if exceeded; prevents prompt injection and credit burn |
| 2.12 | **Fix `voice/page.tsx` stale closure bug** | 🟠 High | S | Frontend | `app/voice/page.tsx` | `useCallback` or `useRef` used for transcript state; speech recognition updates displayed in real-time without stale reads |

**Phase 2 Completion Gate:** All API routes return structured JSON errors. No IDOR tests pass (attempt to access other users' data returns 403). Rate limiter responds 429 after threshold exceeded.

---

## Phase 3: Complete Missing Features (Do After) — P2

| Rank | Fix | Impact | Effort | Owner | Files | Acceptance Criteria |
|------|-----|--------|--------|-------|-------|---------------------|
| 3.1 | **Build `shop/page.tsx` ecommerce** | 🟡 Medium | L | Frontend + Backend | `app/shop/page.tsx`, `app/api/shop/**` | At least 3 purchasable items (PDF export, coins, premium skin); Razorpay checkout integration; coin balance updates after purchase |
| 3.2 | **Implement Battle Royale real-time elimination** | 🟡 Medium | L | Frontend + Backend | `app/battle-royale/page.tsx`, `lib/battle-royale.ts`, `lib/realtime.ts` | Uses `lib/realtime.ts` to broadcast `eliminated_at` updates; `setInterval` polling removed; participants see eliminations within 1 second |
| 3.3 | **Wire Dhwani audio playback** | 🟡 Medium | M | Frontend + Backend | `app/dhwani/page.tsx`, `lib/dhwani-engine.ts` | `audio_url` populated by TTS generation; audio element plays from URL; fallback text display if audio unavailable |
| 3.4 | **Implement Astra video rendering pipeline** | 🟡 Medium | XL | Frontend + Backend | `lib/astra-engine.ts`, `app/astra/page.tsx` | Script generation generates frames; video rendering produces MP4; HTML5 video player displays; `status` transitions to `'rendered'` |
| 3.5 | **Add notification bell component** | 🟡 Medium | M | Frontend | New `components/NotificationBell.tsx`, `layout.tsx` | Real-time subscription to `user_notifications`; unread count badge; dropdown list; mark-as-read on click; integrated into all pages via layout |
| 3.6 | **Implement squad leaderboard + activity feed** | 🟡 Medium | M | Frontend | `app/squads/page.tsx` | Displays squad members with streaks; activity feed of recent actions; sorted by contribution |
| 3.7 | **Build interview question bank** | 🟡 Medium | M | Frontend + Backend | `app/interview/page.tsx`, `lib/interview-bank.ts`, `app/api/interview/questions/route.ts` | Dynamic question fetching from DB; categories (ethics, polity, economy, etc.); previous attempt history displayed |
| 3.8 | **Implement voice wake-word detection** | 🟡 Medium | L | Frontend | `app/voice/page.tsx` | Wake word "PrepX" triggers listening; no button press required; visual feedback when active |
| 3.9 | **Complete Stripe webhook subscription sync** | 🟡 Medium | M | Backend | `app/api/webhooks/stripe/route.ts`, `lib/subscription.ts` | Stripe checkout webhook updates `subscriptions` table; `stripe_customer_id` populated; plan transitions synced |
| 3.10 | **Implement ISA milestone tracker UI** | 🟡 Medium | M | Frontend | `app/isa/page.tsx` | Visual timeline of milestones (enroll → prelims → mains → final); payment status per milestone; progress indicators |
| 3.11 | **Add real-time to territory wars** | 🟡 Medium | L | Frontend + Backend | `lib/territory-conquest.ts`, `app/territory/page.tsx` | War scheduling automation; status transitions triggered by cron; real-time squad conquest updates via `lib/realtime.ts` |
| 3.12 | **Build admin DELETE APIs** | 🟡 Medium | M | Backend | `app/api/admin/**` | DELETE endpoints for topics, quizzes, nudges, tutors, tenants, ISA contracts; admin role enforced; cascade or soft-delete behavior documented |

**Phase 3 Completion Gate:** All P2 features have functional UI + API + DB write. Acceptance criteria verified by E2E tests.

---

## Phase 4: Clean Up & Maintain (Do Last) — P3

| Rank | Fix | Impact | Effort | Owner | Files | Acceptance Criteria |
|------|-----|--------|--------|-------|-------|---------------------|
| 4.1 | **Break schema.sql into domain migrations** | 🟢 Low | L | Database | `supabase/migrations/001_users.sql`, `002_topics.sql`, etc. | One file per sprint/domain; each migration is idempotent (`CREATE TABLE IF NOT EXISTS`); `supabase/migrations/` directory created; rollback script exists |
| 4.2 | **Delete unused lib files** | 🟢 Low | S | Backend | `lib/openai.ts`, `lib/isa-eligibility.ts`, `lib/progression-engine.ts`, `lib/watermark.ts`, `lib/agents/subject-teacher.ts` | Files deleted; no import errors; build passes (`npx tsc --noEmit`) |
| 4.3 | **Remove orphan columns** | 🟢 Low | M | Database | `supabase/schema.sql` (or migrations) | Unused columns (source_url, error_type_labels, auto_injected_at, readiness_score, wager_coins, total_due, geojson where unused) dropped or documented |
| 4.4 | **Add E2E tests for critical flows** | 🟢 Low | XL | QA | `e2e/` | At least 15 E2E specs covering: login, topic view, quiz, battle create, essay match, tutor hire, ISA enroll, payment, admin create topic, admin quiz generate, white-label tenant |
| 4.5 | **Add unit tests for lib modules** | 🟢 Low | L | QA | `__tests__/lib/` | Tests for `ai-router.ts`, `coins.ts`, `plan-generator.ts`, `rank-oracle.ts`, `dhwani-engine.ts`; mock Supabase and AI providers; >80% branch coverage |
| 4.6 | **Replace hardcoded dashboard stats** | 🟢 Low | M | Frontend | `app/page.tsx` | Quiz average computed from `quiz_attempts`; weak areas from `user_weak_areas`; streak from `users.streak_count`; no hardcoded numbers |
| 4.7 | **Replace hardcoded interview questions** | 🟢 Low | M | Frontend | `app/interview/page.tsx` | Questions loaded from DB or API; no hardcoded array in page file |
| 4.8 | **Replace hardcoded battle-royale questions** | 🟢 Low | M | Frontend + Backend | `app/battle-royale/page.tsx`, `lib/battle-royale.ts` | Questions loaded from `quizzes` table; `quiz_id` linked to event |
| 4.9 | **Replace hardcoded dashboard streak** | 🟢 Low | S | Frontend | `app/page.tsx` | Streak count fetched from `users.streak_count` or computed from `activity_log` |
| 4.10 | **Refactor white-label mass assignment** | 🟢 Low | S | Backend | `app/api/white-label/tenants/route.ts` | Whitelist allowed fields in insert/update; reject unknown fields with 400 |
| 4.11 | **Add `req.json()` try/catch wrappers** | 🟢 Low | M | Backend | `app/api/battles/**`, `app/api/daily-plan/**`, `app/api/isa/**`, `app/api/tutors/**`, `app/api/white-label/**` | All `await req.json()` inside try/catch; invalid JSON returns 400 with clear message |
| 4.12 | **Document all dead tables** | 🟢 Low | S | Documentation | `docs/DEPLOYMENT.md` | Table-by-table note on `activity_log`, `agent_tasks`, `user_cohorts` (partial), `battle_royale_events` (partial) — either remove or document purpose and planned activation |

**Phase 4 Completion Gate:** Build passes with zero TS errors. E2E suite passes >80%. Schema migrations are versioned and reversible.

---

## Summary Matrix

| Phase | Items | Effort Total | Business Impact |
|-------|-------|--------------|-----------------|
| 1 — Stop The Bleeding | 10 | ~10 hours | Prevents security breaches, revenue loss, data exposure |
| 2 — Harden & Validate | 12 | ~35 hours | Prevents IDOR, injection, abuse; enforces auth everywhere |
| 3 — Complete Missing Features | 12 | ~60 hours | Ships core value features (shop, real-time, audio, video) |
| 4 — Clean Up & Maintain | 12 | ~40 hours | Enables team scaling, CI reliability, code hygiene |
| **Total** | **46 fixes** | **~145 hours** | **Full remediation to production-grade** |

---

## Recommended Sprint Allocation

| Sprint | Scope | Fixes | Estimated Effort |
|--------|-------|-------|------------------|
| Security Sprint | Phase 1 + Phase 2 (top 5) | Rank 1.1–1.10, 2.1–2.6 | ~25 hours |
| Hardening Sprint | Phase 2 remainder | Rank 2.7–2.12, 3.11–3.12 | ~20 hours |
| Feature Sprint 1 | Phase 3 (core UX) | Rank 3.1–3.5, 3.8 | ~35 hours |
| Feature Sprint 2 | Phase 3 (remaining) | Rank 3.6–3.7, 3.9–3.10 | ~25 hours |
| Quality Sprint | Phase 4 | Rank 4.1–4.12 | ~40 hours |

---

*End of Fix Priority Matrix*
