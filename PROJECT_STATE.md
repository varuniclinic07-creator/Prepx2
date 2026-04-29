# PROJECT_STATE.md

**Last Updated:** 2026-04-29T07:45:00Z
**Project:** PrepX — UPSC CSE Exam Preparation SaaS
**Phase:** VPS Deployment Hardening Complete, Pre-Production-Deploy

---

## Current State

### Build & Test Status
| Gate | Status | Details |
|------|--------|---------|
| `npm install` | PASS | 549 packages, `--legacy-peer-deps` |
| `tsc --noEmit` | PASS | 0 errors |
| `vitest run` | PASS | 85/85 tests, 14 suites |
| `npm run build` | PASS | Production standalone output |
| `npm run lint` | PASS | 0 errors, 4 pre-existing warnings |
| `compose config` | PASS | docker-compose.vps.yml validates |

### Uncommitted Changes
5 files changed (Sprint 15 — VPS Hardening): docker-compose.vps.yml, next.config.ts, middleware.ts, app/api/health/route.ts, .env.vps.example.

### Sprint History
| Sprint | Focus | Status |
|--------|-------|--------|
| Sprint 1-7 | MVP build (full stack) | COMMITTED `bd12d86` |
| Sprint 8-10 | Futuresprint + Deployment | COMMITTED `ebbf186` |
| Sprint 11 | 46 audit findings resolved | COMMITTED `d25172d` |
| Sprint 11.5 | VPS Docker Compose stack | COMMITTED `b40909c` |
| Sprint 11.6 | Coolify peer dep fix | COMMITTED `f759572` |
| Sprint 11.7 | ComfyUI/LTX2.3 integration | COMMITTED `f9588a4` |
| Sprint 12 | Architecture Hardening (9 gaps) | COMMITTED `28b73f3` |
| Sprint 12.1 | DI migration fix + build fix | COMMITTED `28b73f3` |
| Sprint 13 | P0/P1 security closes | COMMITTED `6438243` |
| Sprint 14 | Unit test expansion (39 new tests) | COMMITTED `2462786` |
| Sprint 15 | VPS Deployment Hardening | **UNCOMMITTED** |

---

## Architecture Summary
- **Frontend:** Next.js 15 App Router, React 18, Tailwind CSS, Three.js, Framer Motion
- **Backend:** 48+ API routes, Supabase (PostgreSQL + Auth), Redis
- **AI:** 5-tier provider cascade (9router, Ollama, Groq, Kilo, NVIDIA) with circuit breakers
- **Payments:** Razorpay + Stripe (webhook sig verification)
- **DB:** 43 migrations (001-041, 042-043 new atomic ops + RLS)
- **Tests:** 9 Vitest suites (46 tests), 18 Playwright E2E specs
- **Infra:** Docker 3-stage build, Coolify, VPS 26-service stack

## Key Decisions
1. All `lib/` modules accept `SupabaseClient` parameter (DI pattern)
2. `lib/env.ts` with `requireEnv()`/`optionalEnv()` for credential safety
3. Module-level env reads use `optionalEnv()` to allow build-time evaluation
4. `lib/supabase.ts` warns but doesn't throw on missing env (CI/build compat)
5. Zod validation on all POST API routes
6. `lib/api-response.ts` standardized error format
7. PostgreSQL atomic functions for financial operations (SELECT FOR UPDATE)
8. Next.js 15 dynamic route params use `Promise<{}>` pattern
