# ACTIVE_TASK.md

**Last Updated:** 2026-04-29T07:45:00Z

---

## Current Task: Sprint 15 — VPS Deployment Hardening

**Status:** READY TO COMMIT
**Blocking:** Nothing — all gates pass

### What's done
- `docker-compose.vps.yml` hardened: Traefik HTTPS-only, Redis password, internal network isolated, only ports 80/443 publicly exposed
- App security headers + HSTS + real DB health check
- `.env.vps.example` updated with `REDIS_PASSWORD`
- All gates green (tsc 0 errors, vitest 85/85, lint 0 errors, compose validates)
- 5 files changed

### What's next after commit
1. Production deploy to VPS via Coolify (set `REDIS_PASSWORD` env var first)
2. External port scan to confirm only 80/443 public
3. Verify `/api/health` returns DB-aware health
4. Deploy migrations 042 + 043 to production Supabase if not already done
5. Monitor Traefik access logs and error rates
