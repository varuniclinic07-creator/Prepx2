# PROJECT_STATE.md

**Last Updated:** 2026-04-29T04:55:00Z
**Project:** PrepX — UPSC CSE Exam Preparation SaaS
**Phase:** Post-Architecture Hardening, Pre-Commit

---

## Current State

### Build & Test Status
| Gate | Status | Details |
|------|--------|---------|
| `npm install` | PASS | 549 packages, `--legacy-peer-deps` |
| `tsc --noEmit` | PASS | 0 errors |
| `vitest run` | PASS | 46/46 tests, 9 suites |
| `npm run build` | PASS | Production standalone output |
| `npm run lint` | PASS | 0 errors, 4 pre-existing warnings |

### Uncommitted Changes
47 files changed, 446 insertions, 262 deletions — all from Sprint 12 (Architecture Hardening).

### Sprint History
| Sprint | Focus | Status |
|--------|-------|--------|
| Sprint 1-7 | MVP build (full stack) | COMMITTED `bd12d86` |
| Sprint 8-10 | Futuresprint + Deployment | COMMITTED `ebbf186` |
| Sprint 11 | 46 audit findings resolved | COMMITTED `d25172d` |
| Sprint 11.5 | VPS Docker Compose stack | COMMITTED `b40909c` |
| Sprint 11.6 | Coolify peer dep fix | COMMITTED `f759572` |
| Sprint 11.7 | ComfyUI/LTX2.3 integration | COMMITTED `f9588a4` |
| Sprint 12 | Architecture Hardening (9 gaps) | **UNCOMMITTED** |
| Sprint 12.1 | DI migration fix + build fix | **UNCOMMITTED** |

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
