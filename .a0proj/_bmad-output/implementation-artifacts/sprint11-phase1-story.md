---
type: story
phase: 4-implementation
sprint: 11
critical: true
---

# Phase 1 — Stop The Bleeding (P0 Security)

## Scope
Execute ALL 10 P0 fixes from `sprint11-corrective-course-complete.md`.

## Tasks

### 1. SSR Migration
- [x] Replace `@supabase/auth-helpers-nextjs` patterns with `@supabase/ssr` client/server/server component helpers
- [x] Update `lib/supabase-server.ts`
- [x] Update `lib/supabase-browser.ts`
- [x] Update `middleware.ts`
- [x] Update all route files using auth to use new `createClient` from updated lib

### 2. Fix 1.1 — Auth on `api/payments/razorpay`
- [x] Verify `getUser()` before order creation (401 if no user)
- [x] Replace body `userId` with `user.id` from auth context

### 3. Fix 1.2 — Stripe webhook (SKIP per PM)
- [x] Mark as skipped; Stripe not operational in India

### 4. Fix 1.3 — Auth on `api/mains/evaluate`
- [x] Guard with `getUser()`, return 401 if no user
- [x] Remove `user_id` from request body; use `user.id`

### 5. Fix 1.4 — Remove Razorpay dummy fallbacks
- [x] Delete `rzp_test_dummy` fallback from `api/payments/razorpay`
- [x] Delete `dummy_secret` fallback from `api/payments/razorpay`
- [x] Delete fallback from all ISA/tutors routes if present

### 6. Fix 1.5 — Auth-gate `api/test-ai`
- [x] Guard `POST /api/test-ai` with `getUser()`; return 401 if not authenticated

### 7. Fix 1.6 — Auth on `api/astra/generate`
- [x] Guard with `getUser()`, return 401 if no user

### 8. Fix 1.7 — Auth on `api/mnemonics/generate`
- [x] Guard with `getUser()`, return 401 if no user

### 9. Fix 1.8 — Admin auth on `api/scrape/run`
- [x] Guard with `getUser()`, then verify `profile.role === 'admin'`

### 10. Fix 1.9 — Fix `webhooks/razorpay` timingSafeEqual
- [x] Wrap in try-catch
- [x] Add Buffer.length check before timingSafeEqual (same-length check prevents error)

### 11. Fix 1.10 — RLS on 5 tables
- [ ] Enable RLS on: `topics`, `quizzes`, `squads`, `squad_members`, `user_cohorts`
- [ ] Add enterprise-grade policies: authenticated users SELECT their own rows; admins have full access
- [ ] Write RLS as ALTER TABLE / CREATE POLICY statements
- [ ] Add to `supabase/schema.sql` or a new RLS migration file

## Acceptance Criteria
- All checkboxes above are ✅
- `npx tsc --noEmit` returns EXIT 0, zero errors
- No route creates orders/submissions/evaluations without verifying auth user
- No dummy Razorpay fallbacks remain in codebase
- Razorpay webhook uses length-safe HMAC comparison
- RLS policies are defined (committed to SQL)

## Definition of Done
This story is complete when ALL tasks above are checked, TypeScript compiles clean, and a grep audit confirms no remaining P0 gaps.
