# DEPLOYMENT_STATUS.md

**Last Updated:** 2026-04-29T07:45:00Z

---

## Infrastructure

| Component | Status | Details |
|-----------|--------|---------|
| Docker 3-stage build | READY | `Dockerfile` builds standalone Next.js |
| docker-compose.yml (dev) | READY | app + PostgreSQL 16 + pgAdmin + Redis 7 + ComfyUI |
| docker-compose.vps.yml (prod) | HARDENED | Sprint 15: Traefik HTTPS-only, Redis password, internal network isolated, only ports 80/443 public |
| deploy.sh | READY | VPS deployment with Kong gateway |
| Coolify | CONFIGURED | GitHub webhook auto-deploy on push |
| vercel.json | PRESENT | Vercel fallback deployment |

## Environment
- **Node.js:** 20.x required
- **npm:** Uses `--legacy-peer-deps` flag
- **Build output:** Standalone (`next.config.ts` → `output: 'standalone'`)

## Pending Actions
1. Set all env vars in Coolify/VPS — including the new `REDIS_PASSWORD` (32+ chars)
2. Deploy migrations 042 + 043 to production Supabase
3. After first VPS deploy, verify only ports 80/443 are publicly reachable (run external port scan)
4. Verify `https://${APP_DOMAIN}/api/health` returns `200 {"healthy": true}`
5. Verify HTTP→HTTPS redirect works
6. Verify HSTS, X-Frame-Options, X-Content-Type-Options headers present in responses
7. Run production smoke tests
