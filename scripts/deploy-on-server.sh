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

git fetch origin
# -f: descarta cambios locales en el VPS que rompen el deploy
git checkout -f master
git reset --hard origin/master

export NODE_OPTIONS="--max-old-space-size=1536"
# npm ci con NODE_ENV=production NO instala devDependencies → falta tailwindcss en el build
npm ci --prefer-offline
export NODE_ENV=production
npm run build

pm2 reload jobshour-web --update-env

echo "=== DEPLOY OK $(date -u +"%Y-%m-%dT%H:%M:%SZ") commit=$(git rev-parse --short HEAD) ==="
pm2 list | head -n 20
