# CURRENT_SPRINT.md

**Sprint:** 15 — VPS Deployment Hardening
**Started:** 2026-04-29
**Status:** COMPLETED (awaiting commit)

---

## Goal

Lock down `docker-compose.vps.yml` for production deployment. Eliminate publicly exposed admin/internal ports, password-protect Redis, force HTTPS at the edge, isolate the internal docker network, and add HTTP security headers + an honest health check.

## Changes

### 1. Traefik (edge router)
- `--api.insecure=true` → `--api.dashboard=false` (dashboard off)
- Removed public port `8080:8080` (insecure dashboard)
- Added HTTP→HTTPS redirect at `web` entrypoint
- Added access logging (file: `/var/log/traefik/access.log`)
- New named volume `traefik_logs`

### 2. Redis (cache/queue)
- Added `--requirepass ${REDIS_PASSWORD}` to startup command
- Removed public port `6379:6379` (internal-only now)
- All 7 Redis URL references updated to include password (`redis://:${REDIS_PASSWORD}@redis:6379`)

### 3. Removed unnecessarily exposed ports (now internal-only behind Traefik or docker network)
- `prepx` (Next.js) `3000`
- `db` (Postgres) `5432`
- `supabase-kong` `8000`
- `minio` `9000`, `9001`
- `crawl4ai` `11235`
- `prometheus` `9090`
- `jaeger` `16686`, `14268`, `6831/udp`, `6832/udp`
- `uptime-kuma` `3001`
- `comfyui` `8188`
- `ollama` `11434`
- `imgproxy` `5001`

### 4. Network isolation
- `prepx-internal` set to `internal: true` (no outbound from this network)
- Added `prepx-public` to services that need outbound internet:
  - `supabase-auth` (SMTP, Twilio)
  - `supabase-functions` (external APIs)
  - `crawl4ai` (web crawling)
  - `lecture-queue-worker` (OpenAI API)
  - `comfyui` (model downloads)
  - `ollama` (model pulls)

### 5. App-level hardening
- `next.config.ts`: narrowed image `remotePatterns` from `**` to known hosts, set `poweredByHeader: false`, added security headers (X-Content-Type-Options, X-Frame-Options, Referrer-Policy, Permissions-Policy), added long-cache header for static assets
- `middleware.ts`: emit security headers + HSTS on HTTPS responses
- `app/api/health/route.ts`: now performs a real DB connectivity check; returns 503 + `healthy:false` when Postgres is unreachable

### 6. Env example
- `.env.vps.example`: added `REDIS_PASSWORD`, updated `REDIS_URL` to include credentials

## Verification

| Gate | Result |
|------|--------|
| `tsc --noEmit` | 0 errors |
| `npm run test:run` (vitest) | 85/85 pass |
| `npm run lint` | 0 errors, 4 pre-existing warnings |
| `docker compose -f docker-compose.vps.yml config --quiet` | exit 0 (valid) |

## Files changed (5)

- `docker-compose.vps.yml`
- `next.config.ts`
- `middleware.ts`
- `app/api/health/route.ts`
- `.env.vps.example`
