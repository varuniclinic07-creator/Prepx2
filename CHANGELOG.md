# CHANGELOG.md

## [Unreleased] — Sprint 12 + 12.1 + 13

### Security
- Added HMAC-SHA256 Stripe webhook signature verification
- Added Zod input validation on all POST API routes
- Added `is_admin()` PostgreSQL function for RLS policies
- Replaced `USING(true)` INSERT policies with admin check
- Added `lib/env.ts` credential safety (`requireEnv`/`optionalEnv`)
- Added `lib/api-response.ts` standardized error responses
- **Sprint 13:** Added Telegram webhook secret token verification (`X-Telegram-Bot-Api-Secret-Token` + `timingSafeEqual`)
- **Sprint 13:** Added admin authentication to white-label tenants GET endpoint (was publicly accessible)

### Architecture
- All `lib/` modules now accept `SupabaseClient` parameter (dependency injection)
- Added `app/api/coins/award/route.ts` for client-side coin operations
- Added PostgreSQL atomic functions: `spend_coins()`, `accept_battle()`
- Rate limiting: memory-bounded Map with 10K cap, TTL cleanup, `X-RateLimit-*` headers
- Realtime: typed callbacks, dedup channels, auto-reconnect

### Fixes
- Fixed 6 callers missing `supabase` param after DI migration
- Fixed `Buffer` → `Uint8Array` for Stripe `timingSafeEqual`
- Fixed Next.js 15 dynamic route params (`Promise<{}>` pattern, 7 routes)
- Fixed module-level `requireEnv` → `optionalEnv` for build compatibility
- Restored Supabase client graceful fallback for CI/build
- Created missing `lib/subscription.ts` module
- Added ESLint config (`.eslintrc.json`)
- Fixed unescaped HTML entities in dhwani + ranks pages
- Fixed test env vars for ai-router and supabase test suites

### Database
- Migration 042: `spend_coins()`, `accept_battle()` atomic functions
- Migration 043: `is_admin()` function, tightened RLS INSERT policies

---

## [1.0.0] — 2026-04-28 (commit f9588a4)

### Features
- ComfyUI + LTX2.3 AI video generation integration
- Complete 26-service VPS Docker Compose stack
- Coolify deployment configuration
- Sprint 8-11 features (Futuresprint)
- Full MVP implementation (Sprint 1-7)
