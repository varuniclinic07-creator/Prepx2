# NEXT_STEPS.md

**Last Updated:** 2026-04-29T07:45:00Z

---

## Sprint 15 (just completed) — see CURRENT_SPRINT.md

VPS compose + app hardening landed; ready to commit.

---

## Immediate (post-commit)

### 1. Deploy to VPS
- Set `REDIS_PASSWORD` (32+ chars) and all other env vars in Coolify or `.env.vps`
- Pull & redeploy via `docker compose -f docker-compose.vps.yml up -d`
- Run external port scan from a non-VPS host: only 80, 443 should answer
- Confirm `https://${APP_DOMAIN}/api/health` → 200 `{healthy: true}`
- Confirm `http://${APP_DOMAIN}` redirects to https
- Confirm `Strict-Transport-Security`, `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy` headers present

### 2. Database migrations
- Apply `042_atomic_financial_operations.sql` (`spend_coins()`, `accept_battle()`)
- Apply `043_tighten_rls_policies.sql` (`is_admin()` + restrictive INSERT policies)

---

## Sprint 16 (proposed) — Production observability

1. Wire Sentry DSN, verify error events arrive
2. Configure Grafana dashboards from Prometheus metrics
3. Set up Uptime Kuma external probes for `/api/health`, `/`, `/api/quizzes`
4. Add structured logging (already in app code) → ship to Plausible/Loki
5. Document the on-call playbook (incident response, redeploy, rollback)

---

## Sprint 17 (proposed) — Remaining security audit items

From `BACKEND_SECURITY_AUDIT.md` — anything still open after Sprint 13:
- Re-audit unauthenticated LLM endpoints
- Re-audit IDOR in battles, essay-colosseum
- Add e2e tests covering rate-limited routes and auth boundaries
