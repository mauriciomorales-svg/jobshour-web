#!/usr/bin/env bash
# Ejecutar EN el VPS (bash), o desde Windows: .\scripts\deploy-from-windows.ps1 -Server IP
set -euo pipefail

ROOT="/var/www/jobshour-web"
if [[ ! -d "$ROOT" ]]; then
  echo "ERROR: no existe $ROOT (ajusta ROOT en el script si tu ruta es otra)" >&2
  exit 1
fi
cd "$ROOT"

command -v git >/dev/null || { echo "ERROR: git no instalado" >&2; exit 1; }
command -v npm >/dev/null || { echo "ERROR: npm no instalado" >&2; exit 1; }
command -v pm2 >/dev/null || { echo "ERROR: pm2 no instalado" >&2; exit 1; }

echo "=== JobsHour Web deploy ==="
echo "PWD=$(pwd)  NODE=$(node -v 2>/dev/null || echo ?)  GIT=$(git rev-parse --short HEAD 2>/dev/null || echo ?)"

# Rama a desplegar (CI pasa DEPLOY_BRANCH=${{ github.ref_name }}; por defecto master)
BRANCH="${DEPLOY_BRANCH:-master}"
echo "Rama: $BRANCH"

git fetch origin
# -f: descarta cambios locales en el VPS que rompen el deploy
git checkout -f "$BRANCH"
git reset --hard "origin/$BRANCH"

export NODE_OPTIONS="--max-old-space-size=1536"
# npm ci con NODE_ENV=production NO instala devDependencies → falta tailwindcss en el build
npm ci --prefer-offline
export NODE_ENV=production
# Evita embeber localhost del .env.local del VPS; getPublicApiBase() también lo corrige en runtime
export NEXT_PUBLIC_API_URL="${NEXT_PUBLIC_API_URL:-https://jobshours.com/api}"
export NEXT_PUBLIC_PUSHER_KEY="${NEXT_PUBLIC_PUSHER_KEY:-9a309a9f35c89457ea2c}"
export NEXT_PUBLIC_PUSHER_CLUSTER="${NEXT_PUBLIC_PUSHER_CLUSTER:-us2}"
npm run build

pm2 reload jobshour-web --update-env

echo "=== DEPLOY OK $(date -u +"%Y-%m-%dT%H:%M:%SZ") commit=$(git rev-parse --short HEAD) ==="
pm2 list | head -n 20
