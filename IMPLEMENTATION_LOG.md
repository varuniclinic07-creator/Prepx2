# IMPLEMENTATION_LOG.md

**Last Updated:** 2026-04-29T04:55:00Z

---

## 2026-04-29 — Sprint 12.1: Build & Test Fixes

### Context
Sprint 12 completed 9 architecture hardening tasks but left the project in a non-buildable state (dependencies missing, incomplete DI migration, type errors).

### Changes

#### 1. DI Caller Migration (6 callers)
- `app/api/battle-royale/route.ts` — Added `supabase` param to all 8 lib function calls
- `app/api/battles/create/route.ts` — Added `supabase` param to `spendCoins()`
- `app/onboarding/page.tsx` — Added `supabase` param to `createSession()`
- `components/TopicViewer.tsx` — Added `supabase` param to `transition()`

#### 2. Stripe Webhook Buffer Fix
- `app/api/webhooks/stripe/route.ts` — Wrapped Buffer in `new Uint8Array()` for `timingSafeEqual` compatibility

#### 3. Realtime Type Safety
- `app/battle-royale/page.tsx` — Cast `payload.new` through `unknown` to `EventData`

#### 4. Test Environment
- `__tests__/lib/ai-router.test.ts` — Added `OLLAMA_API_KEY` env var
- `__tests__/lib/supabase.test.ts` — Added `vi.hoisted()` env var setup

#### 5. Missing Module
- `lib/subscription.ts` — Created: `hasFeature()`, `getUserPlan()`, `canUseFeature()` with plan rank comparison

#### 6. Build-Time Env Safety
- `lib/ai-router.ts` — Changed GROQ_KEYS and KILO_KEYS from `requireEnv` to `optionalEnv` (module-level)
- `lib/telegram-bot.ts` — Changed BOT_TOKEN from `requireEnv` to `optionalEnv`
- `lib/supabase.ts` — Restored graceful fallback (warn, don't throw)

#### 7. Next.js 15 Params Migration (7 routes)
- `app/api/admin/isa/[id]/route.ts`
- `app/api/admin/nudges/[id]/route.ts`
- `app/api/admin/quizzes/[id]/route.ts`
- `app/api/admin/tenants/[id]/route.ts`
- `app/api/admin/topics/[id]/route.ts`
- `app/api/admin/tutors/[id]/route.ts`
- `app/api/white-label/tenants/[slug]/route.ts`

#### 8. ESLint
- Created `.eslintrc.json` (next/core-web-vitals)
- `app/dhwani/page.tsx` — Escaped apostrophes
- `app/ranks/page.tsx` — Escaped quotes

### Verification
- `tsc --noEmit`: 0 errors
- `vitest run`: 46/46 pass (9 suites)
- `npm run build`: SUCCESS
- `npm run lint`: 0 errors

---

## 2026-04-28 — Sprint 12: Architecture Hardening (9 Gaps)

### Changes (committed by previous session, uncommitted)
1. Race conditions → PostgreSQL atomic functions (`SELECT FOR UPDATE`)
2. Stripe webhook → HMAC-SHA256 signature verification
3. RLS policies → `is_admin()` replaces `USING(true)`
4. Data access → All lib modules accept `SupabaseClient` param
5. Error handling → `lib/api-response.ts` standardized helpers
6. Rate limiting → Memory-bounded Map with TTL cleanup
7. Real-time → Typed callbacks, dedup channels, auto-reconnect
8. Input validation → Zod schemas on all POST routes
9. Credentials → `lib/env.ts` with `requireEnv()`/`optionalEnv()`

### New Files
- `lib/api-response.ts`
- `lib/env.ts`
- `app/api/coins/award/route.ts` (client → API route for coin ops)
- `supabase/migrations/042_atomic_financial_operations.sql`
- `supabase/migrations/043_tighten_rls_policies.sql`
