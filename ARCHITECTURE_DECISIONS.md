# ARCHITECTURE_DECISIONS.md

**Last Updated:** 2026-04-29T04:55:00Z

---

## ADR-001: Supabase Client Triple
- **Server Components/API routes:** `lib/supabase-server.ts` (cookie-based, `@supabase/ssr`)
- **Client Components:** `lib/supabase-browser.ts` (`createBrowserClient`)
- **Shared/lib business logic:** `lib/supabase.ts` (`@supabase/supabase-js`, graceful fallback for CI)

## ADR-002: Dependency Injection for lib/ modules
- **Decision:** All `lib/` functions that touch Supabase accept `SupabaseClient` as first parameter
- **Why:** Enables testability, avoids singleton coupling, prevents client components from bypassing RLS
- **Affected:** `lib/coins.ts`, `lib/battle-royale.ts`, `lib/agents/hermes.ts`, `lib/realtime.ts`, `lib/rank-oracle.ts`, `lib/rank-progression.ts`
- **Date:** 2026-04-28

## ADR-003: Environment Variable Safety
- **Decision:** `lib/env.ts` provides `requireEnv(key)` and `optionalEnv(key, fallback)`
- **Constraint:** Module-level (top-of-file) initialization MUST use `optionalEnv()` because Next.js evaluates these at build time
- **Runtime calls** inside functions CAN use `requireEnv()` since they only run with env vars present
- **Date:** 2026-04-28

## ADR-004: Atomic Financial Operations
- **Decision:** PostgreSQL `spend_coins()` and `accept_battle()` functions use `SELECT FOR UPDATE` for atomicity
- **Migration:** `042_atomic_financial_operations.sql`
- **Date:** 2026-04-28

## ADR-005: RLS Policy Tightening
- **Decision:** Replaced all `USING(true)` INSERT policies with `is_admin()` function check
- **Migration:** `043_tighten_rls_policies.sql`
- **Date:** 2026-04-28

## ADR-006: Stripe Webhook HMAC Verification
- **Decision:** Custom `verifyStripeSignature()` with `crypto.timingSafeEqual` (no Stripe SDK dependency)
- **Location:** `app/api/webhooks/stripe/route.ts`
- **Date:** 2026-04-28

## ADR-007: Zod Input Validation
- **Decision:** All POST API routes use Zod schemas for body validation
- **Pattern:** Parse body → `safeParse` → return 400 with issues on failure
- **Date:** 2026-04-28

## ADR-008: Standardized API Error Format
- **Decision:** `lib/api-response.ts` exports `apiError()` and `apiSuccess()` helpers
- **Format:** `{ error: string, status: number }` for errors, `{ data: T }` for success
- **Date:** 2026-04-28

## ADR-009: Rate Limiting
- **Decision:** In-memory Map with 10K cap, TTL cleanup, per IP+path
- **Tiers:** 30 req/min for payments, 100 for LLM, 1000 default
- **Headers:** Standard `X-RateLimit-*` headers on all responses
- **Location:** `middleware.ts`
- **Date:** 2026-04-28

## ADR-010: Next.js 15 Dynamic Route Params
- **Decision:** All dynamic route handlers use `{ params: Promise<{...}> }` and `await params`
- **Why:** Next.js 15 App Router change — params are now async
- **Date:** 2026-04-29
