# NEXT_STEPS.md

**Last Updated:** 2026-04-29T04:55:00Z

---

## Immediate (Sprint 12.2)

### 1. Commit Sprint 12 + 12.1 changes
- 47 files modified
- All gates green (tsc, vitest, build, lint)
- Commit message: "fix: Sprint 12 architecture hardening + build/test fixes"

### 2. Deploy migrations 042 + 043
- `042_atomic_financial_operations.sql` — `spend_coins()`, `accept_battle()` functions
- `043_tighten_rls_policies.sql` — `is_admin()` function, restrictive INSERT policies
- Deploy to Supabase via SQL Editor or CLI

---

## Sprint 13: Remaining Security Audit (P0/P1)

### P0 — Critical
1. **Auth on LLM endpoints:** Add `getUser()` to `astra/generate`, `mains/evaluate`, `test-ai`
2. **Remove IDOR:** `rank/predict` should use `user.id` not `body.user_id`
3. **Remove IDOR:** `mains/evaluate` should use session user, not body param

### P1 — High Priority
4. **IDOR: essay-colosseum/submit** — Validate user is participant
5. **IDOR: essay-colosseum/accept** — Validate invitation/ownership
6. **Mass assignment: white-label/tenants** — Zod whitelist on POST body
7. **Auth: scrape/run** — Add admin role check
8. **Telegram bot: secret verification** — Add `X-Telegram-Bot-Api-Secret-Token` header check

---

## Sprint 14: Test Coverage + E2E

1. Add unit tests for `lib/battle-royale.ts`, `lib/realtime.ts`, `lib/agents/hermes.ts`
2. Add integration test for rate limiting middleware
3. Add integration test for webhook signature verification
4. Run full E2E suite against dev server with Supabase

---

## Sprint 15: Production Deployment

1. Set all environment variables in Coolify
2. Deploy to VPS via Docker Compose or Coolify
3. Run smoke tests against production
4. Monitor error rates and performance
5. Set up alerting (Prometheus/Grafana)
