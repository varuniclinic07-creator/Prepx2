#!/usr/bin/env bash
# =============================================================================
# PrepX VPS Deployment Script
# =============================================================================
set -euo pipefail

GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log() { echo -e "${BLUE}[Deploy]${NC} $1"; }
ok()  { echo -e "${GREEN}[OK]${NC}   $1"; }
err() { echo -e "${RED}[ERR]${NC}  $1" >&2; exit 1; }

# ---------------------------------------------------------------------------
# 1. Verify .env.vps exists
# ---------------------------------------------------------------------------
if [[ ! -f .env.vps ]]; then
    err ".env.vps not found. Copy .env.vps.example and fill in all values."
fi

log "Step 1/8 — Verifying .env.vps..."
source .env.vps
ok '.env.vps loaded'

# ---------------------------------------------------------------------------
# 2. Verify Docker and docker compose
# ---------------------------------------------------------------------------
log "Step 2/8 — Verifying Docker..."
command -v docker >/dev/null 2>&1 || err "Docker not installed. Install Docker first (https://docs.docker.com/engine/install/)"
docker compose version >/dev/null 2>&1 || err "Docker Compose plugin not installed."
ok "Docker + docker compose OK"

# ---------------------------------------------------------------------------
# 3. Create helper directories
# ---------------------------------------------------------------------------
log "Step 3/8 — Preparing directories..."
mkdir -p vps/monitoring/grafana/provisioning/{datasources,dashboards}
mkdir -p vps/init
mkdir -p scripts/lecture-queue
mkdir -p scripts/manim
mkdir -p scripts/comfyui-workflows
ok "Directories ready"

# ---------------------------------------------------------------------------
# 4. Create Kong declarative config if missing
# ---------------------------------------------------------------------------
if [[ ! -f vps/init/kong.yml ]]; then
    log "Step 4/8 — Writing Kong config..."
    cat > vps/init/kong.yml <<'KONGCFG'
_format_version: "3.0"
_transform: true
services:
  - name: supabase-rest
    url: http://supabase-rest:3000
    routes:
      - name: supabase-rest-route
        paths: ["/rest/v1"]
        strip_path: false
    plugins:
      - name: cors
        config:
          origins: ["*"]
          methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"]
          headers: ["*"]
          max_age: 3600

  - name: supabase-realtime
    url: http://supabase-realtime:4000
    routes:
      - name: supabase-realtime-route
        paths: ["/realtime/v1"]
        strip_path: false
    plugins:
      - name: cors
        config:
          origins: ["*"]
          methods: ["GET", "POST", "OPTIONS"]
          headers: ["*"]

  - name: supabase-storage
    url: http://supabase-storage:5000
    routes:
      - name: supabase-storage-route
        paths: ["/storage/v1"]
        strip_path: false
    plugins:
      - name: cors
        config:
          origins: ["*"]
          methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"]
          headers: ["*"]

  - name: prepx-api
    url: http://prepx:3000
    routes:
      - name: prepx-api-route
        paths: ["/api"]
        strip_path: false
    plugins:
      - name: rate-limiting
        config:
          minute: 1000
          policy: redis
          redis_host: redis
          redis_port: 6379
KONGCFG
    ok "Kong config created"
else
    log "Step 4/8 — Kong config already exists, skipping..."
    ok "Kong config OK"
fi

# ---------------------------------------------------------------------------
# 5. Create Grafana provisioning if missing
# ---------------------------------------------------------------------------
if [[ ! -f vps/monitoring/grafana/provisioning/datasources/datasources.yml ]]; then
    log "Step 5/8 — Writing Grafana provisioning..."
    cat > vps/monitoring/grafana/provisioning/datasources/datasources.yml <<'GRAFANADS'
apiVersion: 1
datasources:
  - name: Prometheus
    type: prometheus
    access: proxy
    url: http://prometheus:9090
    isDefault: true
    editable: false

  - name: Jaeger
    type: jaeger
    access: proxy
    url: http://jaeger:16686
    editable: false
GRAFANADS
    ok "Grafana datasources created"
else
    log "Step 5/8 — Grafana provisioning already exists, skipping..."
    ok "Grafana OK"
fi

# ---------------------------------------------------------------------------
# 6. Create lecture worker placeholder if missing
# ---------------------------------------------------------------------------
if [[ ! -f scripts/lecture-queue/lecture_worker.py ]]; then
    log "Step 6/8 — Writing lecture worker placeholder..."
    cat > scripts/lecture-queue/lecture_worker.py <<'PYEOF'
import os, time, redis, psycopg
from celery import Celery

REDIS_URL = os.getenv("REDIS_URL", "redis://redis:6379")
DB_URL = os.getenv("POSTGRES_URL", "postgres://localhost:5432/prepx")

app = Celery("lecture_worker", broker=REDIS_URL, backend=REDIS_URL)

@app.task
def process_lecture(lecture_id: str, source_url: str):
    """Download, transcribe, and index a lecture."""
    print(f"[LectureWorker] Processing {lecture_id} from {source_url}")
    # -- your pipeline here --
    return {"lecture_id": lecture_id, "status": "processed"}

if __name__ == "__main__":
    app.worker_main()
PYEOF
    ok "Lecture worker placeholder created"
else
    log "Step 6/8 — Lecture worker already exists, skipping..."
    ok "Lecture worker OK"
fi

# ---------------------------------------------------------------------------
# 7. Pull images and start stack
# ---------------------------------------------------------------------------
log "Step 7/8 — Pulling Docker images (this may take a few minutes)..."
docker compose -f docker-compose.vps.yml pull || true
log "Starting all services..."
docker compose -f docker-compose.vps.yml up -d --build
ok "Stack started"

# ---------------------------------------------------------------------------
# 8. Wait for health + summary
# ---------------------------------------------------------------------------
log "Step 8/8 — Health checks..."
sleep 5

HEALTHY=0
UNHEALTHY=0
for svc in prepx postgres redis kong plausible grafana jaeger; do
    if docker compose -f docker-compose.vps.yml ps "$svc" | grep -q "healthy"; then
        ok "$svc is healthy"
        ((HEALTHY++))
    elif docker compose -f docker-compose.vps.yml ps "$svc" | grep -q "running"; then
        ok "$svc is running (no healthcheck defined)"
        ((HEALTHY++))
    else
        err "$svc is not healthy"
        ((UNHEALTHY++))
    fi
    sleep 1
done

echo ""
echo "============================================================================="
echo "                         🚀 DEPLOYMENT COMPLETE"
echo "============================================================================="
echo ""
echo "  App:          https://${APP_DOMAIN:-aimasteryedu.in}"
echo "  Admin:        https://${APP_DOMAIN:-aimasteryedu.in}/admin"
echo "  Grafana:      https://grafana.${APP_DOMAIN:-aimasteryedu.in}"
echo "  Prometheus:   http://$(hostname -I | awk '{print $1}'):9090"
echo "  Jaeger:       http://$(hostname -I | awk '{print $1}'):16686"
echo "  Uptime Kuma:  https://status.${APP_DOMAIN:-aimasteryedu.in}"
echo "  Plausible:    https://analytics.${APP_DOMAIN:-aimasteryedu.in}"
echo "  n8n:          https://n8n.${APP_DOMAIN:-aimasteryedu.in}"
echo "  Mautic:       https://mautic.${APP_DOMAIN:-aimasteryedu.in}"
echo "  MinIO:        https://cdn.${APP_DOMAIN:-aimasteryedu.in}"
echo "  ComfyUI:      http://$(hostname -I | awk '{print $1}'):8188"
echo "  Ollama:       http://$(hostname -I | awk '{print $1}'):11434"
echo ""
echo "  Services healthy: $HEALTHY  |  Unhealthy: $UNHEALTHY"
echo ""
echo "  Useful commands:"
echo "    docker compose -f docker-compose.vps.yml logs -f prepx"
echo "    docker compose -f docker-compose.vps.yml exec db psql -U postgres -d postgres"
echo "    docker compose -f docker-compose.vps.yml exec redis redis-cli ping"
echo ""
echo "============================================================================="
