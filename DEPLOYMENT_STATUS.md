# DEPLOYMENT_STATUS.md

**Last Updated:** 2026-04-29T04:55:00Z

---

## Infrastructure

| Component | Status | Details |
|-----------|--------|---------|
| Docker 3-stage build | READY | `Dockerfile` builds standalone Next.js |
| docker-compose.yml (dev) | READY | app + PostgreSQL 16 + pgAdmin + Redis 7 + ComfyUI |
| docker-compose.vps.yml (prod) | READY | 26-service stack (Traefik, Supabase, MinIO, Prometheus, Grafana, n8n) |
| deploy.sh | READY | VPS deployment with Kong gateway |
| Coolify | CONFIGURED | GitHub webhook auto-deploy on push |
| vercel.json | PRESENT | Vercel fallback deployment |

## Environment
- **Node.js:** 20.x required
- **npm:** Uses `--legacy-peer-deps` flag
- **Build output:** Standalone (`next.config.ts` → `output: 'standalone'`)

## Pending Actions
1. Commit current changes before deploying
2. Deploy migrations 042 + 043 to production Supabase
3. Set all env vars in Coolify/VPS
4. Run production smoke tests
