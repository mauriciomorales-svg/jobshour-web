#!/usr/bin/env bash
# ============================================================
# deploy-on-server.sh – Deploy Next.js JobsHours Web en el VPS
# Ejecutar EN el VPS: bash /var/www/jobshour-web/scripts/deploy-on-server.sh
# ============================================================
set -euo pipefail

ROOT="/var/www/jobshour-web"
LOG_FILE="/var/log/jobshours-web-deploy.log"
BRANCH="${DEPLOY_BRANCH:-master}"

log()  { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" | tee -a "$LOG_FILE"; }
fail() { log "❌ ERROR: $*"; exit 1; }

[[ -d "$ROOT" ]] || fail "No existe $ROOT (ajusta ROOT si tu ruta es otra)"
cd "$ROOT"

command -v git  >/dev/null || fail "git no instalado"
command -v npm  >/dev/null || fail "npm no instalado"
command -v pm2  >/dev/null || fail "pm2 no instalado"

log "=== JobsHour Web deploy — rama: $BRANCH ==="
log "NODE=$(node -v 2>/dev/null || echo ?)  commit=$(git rev-parse --short HEAD 2>/dev/null || echo ?)"

# ── 1. Pull ───────────────────────────────────────────────────────────────────
log "=== [1/5] Pull ==="
git fetch origin
git checkout -f "$BRANCH"
git reset --hard "origin/$BRANCH"
log "Nuevo commit: $(git rev-parse --short HEAD)"

# ── 2. PWA: nuevo nombre de caché en cada deploy (app instalada / Añadir a inicio) ─
log "=== [2/6] PWA service worker — invalidar caché ==="
SW_TAG="jobshours-$(date -u +%Y%m%d)-$(git rev-parse --short HEAD)"
if [[ -f public/sw.js ]]; then
  sed -i "s/^const CACHE_NAME = '.*'/const CACHE_NAME = '${SW_TAG}'/" public/sw.js
  log "CACHE_NAME=${SW_TAG}"
else
  log "⚠️  public/sw.js no encontrado, se omite"
fi

# ── 3. Dependencias ──────────────────────────────────────────────────────────
log "=== [3/6] npm ci (o npm install si el lock no coincide) ==="
export NODE_OPTIONS="--max-old-space-size=1536"
if ! npm ci --prefer-offline; then
  log "⚠️  npm ci falló — usando npm install"
  npm install --prefer-offline
fi

# ── 4. Build ─────────────────────────────────────────────────────────────────
log "=== [4/6] Build ==="
export NODE_ENV=production
export NEXT_PUBLIC_API_URL="${NEXT_PUBLIC_API_URL:-https://jobshours.com/api}"
export INTERNAL_API_ORIGIN="${INTERNAL_API_ORIGIN:-http://127.0.0.1:8095}"
export INTERNAL_INVENTARIO_ORIGIN="${INTERNAL_INVENTARIO_ORIGIN:-http://127.0.0.1:8003}"
export NEXT_PUBLIC_PUSHER_KEY="${NEXT_PUBLIC_PUSHER_KEY:-9a309a9f35c89457ea2c}"
export NEXT_PUBLIC_PUSHER_CLUSTER="${NEXT_PUBLIC_PUSHER_CLUSTER:-us2}"
npm run build

# ── 5. PM2 reload (zero-downtime) ────────────────────────────────────────────
log "=== [5/6] PM2 reload ==="
# Si el proceso no existe aún, lo creamos con el ecosistema
if pm2 list | grep -q "jobshour-web"; then
    pm2 reload jobshour-web --update-env
else
    pm2 start ecosystem.config.js --env production
fi
pm2 save  # Persiste la lista de procesos para reinicios del sistema

# ── 6. Health check ──────────────────────────────────────────────────────────
log "=== [6/6] Health check ==="
sleep 5
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 "http://127.0.0.1:3000/" || echo "000")

if [[ "$HTTP_STATUS" == "200" ]]; then
    log "✅ Health check OK (HTTP $HTTP_STATUS)"
else
    log "⚠️  Health check retornó HTTP $HTTP_STATUS — verificar manualmente"
fi

# ── Estado final ─────────────────────────────────────────────────────────────
log ""
log "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
log "✅ Deploy Web completado"
log "   Commit: $(git rev-parse HEAD)"
log "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
pm2 list
