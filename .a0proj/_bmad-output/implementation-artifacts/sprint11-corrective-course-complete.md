---
type: corrective-course
parent: audit-report-2026-04-26.md
auditor: BMAD Wendy
date: 2026-04-26
phase: 4-implementation
critical: true
status: COMPLETE
---
---

# Sprint 11 Corrective Course — COMPLETE REMEDIATION

## User Requirement
**ZERO missing pieces. ZERO issues. Production-grade ONLY.**

46 audit findings. ALL must be resolved before deployment. No exceptions.

---

## Phase 1 — Stop The Bleeding (P0 Security — 10 Fixes)

- [ ] 1.1 Auth on `api/payments/razorpay` — verify `req.user.id` before order creation
- [ ] 1.2 Stripe webhook signature verification via `stripe.webhooks.constructEvent`
- [ ] 1.3 Auth on `api/mains/evaluate` — guard with `getUser()`, remove user_id from body
- [ ] 1.4 Remove ALL Razorpay dummy fallbacks (`rzp_test_dummy`) from payments, tutors, isa routes
- [ ] 1.5 Auth-gate or DELETE `api/test-ai` — no public AI credit burn endpoint
- [ ] 1.6 Auth on `api/astra/generate`
- [ ] 1.7 Auth on `api/mnemonics/generate`
- [ ] 1.8 Admin auth on `api/scrape/run`
- [ ] 1.9 Fix `webhooks/razorpay` timingSafeEqual (try-catch + buffer length check)
- [ ] 1.10 RLS on `topics`, `quizzes`, `squads`, `squad_members`, `user_cohorts`

## Phase 2 — Harden & Validate (P1 — 12 Fixes)

- [ ] 2.1 Zod validation on ALL API routes (every `req.json()` wrapped in Zod schema)
- [ ] 2.2 try/catch on 15 routes missing error handling (battles, daily-plan, isa, predictions, spatial, tutors, white-label)
- [ ] 2.3 Rate limiting middleware via Upstash Redis (100 req/min AI, 30 payments, 1000 general)
- [ ] 2.4 Fix IDOR on `api/rank/predict` (verify body.user_id == user.id)
- [ ] 2.5 Fix IDOR on `api/essay-colosseum/submit` (verify match ownership)
- [ ] 2.6 Fix IDOR on `api/essay-colosseum/accept` (verify invitation)
- [ ] 2.7 Admin role re-check on admin API routes (isa, white-label, dhwani, battle-royale)
- [ ] 2.8 Fix duplicate index names (idx_notifications_user_read, idx_battle_participants_user)
- [ ] 2.9 DELETE capability on 5 admin pages (content, quizzes, nudges, tutors, white-label)
- [ ] 2.10 Remove `process.env` leakage from `/admin/ai-providers`
- [ ] 2.11 Input length caps on 6 LLM routes (10,000 char max, 413 if exceeded)
- [ ] 2.12 Fix `voice/page.tsx` stale closure (useCallback or useRef for transcript)

## Phase 3 — Complete Missing Features (P2 — 12 Fixes)

- [ ] 3.1 Build `shop/page.tsx` with real purchasable items + Razorpay checkout
- [ ] 3.2 Battle Royale real-time via `lib/realtime.ts` (not setInterval polling)
- [ ] 3.3 Dhwani audio playback (TTS generation → audio_url → HTML5 audio)
- [ ] 3.4 Astra video rendering pipeline (frames → MP4 → video player)
- [ ] 3.5 Notification bell component + real-time subscription
- [ ] 3.6 Squad leaderboard + activity feed on `/squads`
- [ ] 3.7 Interview question bank (dynamic from DB, not hardcoded)
- [ ] 3.8 Voice wake-word detection ("PrepX" triggers listening)
- [ ] 3.9 Stripe webhook subscription sync (update subscriptions table)
- [ ] 3.10 ISA milestone tracker UI (timeline + payment status)
- [ ] 3.11 Territory wars auto-transition (cron scheduling, real-time updates)
- [ ] 3.12 Admin DELETE APIs (topics, quizzes, nudges, tutors, tenants, ISA)

## Phase 4 — Clean Up & Maintain (P3 — 12 Fixes)

- [ ] 4.1 Break schema.sql into 25 domain migration files
- [ ] 4.2 Delete 8 unused lib files (openai.ts, isa-eligibility.ts, progression-engine.ts, watermark.ts, subject-teacher.ts, etc.)
- [ ] 4.3 Remove 12 orphan columns (source_url, error_type_labels, readiness_score, geojson, etc.)
- [ ] 4.4 E2E tests for critical flows (min 15 specs)
- [ ] 4.5 Unit tests for lib modules (>80% branch coverage)
- [ ] 4.6 Replace hardcoded dashboard stats (read from DB)
- [ ] 4.7 Replace hardcoded interview questions
- [ ] 4.8 Replace hardcoded battle-royale questions
- [ ] 4.9 Streak count from `users.streak_count` or `activity_log`
- [ ] 4.10 White-label mass assignment fix (whitelist allowed fields)
- [ ] 4.11 `req.json()` try/catch on all routes
- [ ] 4.12 Document dead tables (activity_log, agent_tasks) in DEPLOYMENT.md

## Acceptance Criteria
- [ ] All 46 fixes complete
- [ ] `npx tsc --noEmit` = 0 errors after every phase
- [ ] All API routes have auth checks
- [ ] All tables have RLS
- [ ] All admin pages have DELETE capability
- [ ] E2E test suite passes >80%
- [ ] Build clean
