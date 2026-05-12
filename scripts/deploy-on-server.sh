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

# ── 2. Dependencias ──────────────────────────────────────────────────────────
log "=== [2/5] npm ci ==="
export NODE_OPTIONS="--max-old-space-size=1536"
npm ci --prefer-offline

# ── 3. Build ─────────────────────────────────────────────────────────────────
log "=== [3/5] Build ==="
export NODE_ENV=production
export NEXT_PUBLIC_API_URL="${NEXT_PUBLIC_API_URL:-https://jobshours.com/api}"
export NEXT_PUBLIC_PUSHER_KEY="${NEXT_PUBLIC_PUSHER_KEY:-9a309a9f35c89457ea2c}"
export NEXT_PUBLIC_PUSHER_CLUSTER="${NEXT_PUBLIC_PUSHER_CLUSTER:-us2}"
npm run build

# ── 4. PM2 reload (zero-downtime) ────────────────────────────────────────────
log "=== [4/5] PM2 reload ==="
# Si el proceso no existe aún, lo creamos con el ecosistema
if pm2 list | grep -q "jobshour-web"; then
    pm2 reload jobshour-web --update-env
else
    pm2 start ecosystem.config.js --env production
fi
pm2 save  # Persiste la lista de procesos para reinicios del sistema

# ── 5. Health check ──────────────────────────────────────────────────────────
log "=== [5/5] Health check ==="
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
