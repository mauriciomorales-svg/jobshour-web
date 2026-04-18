#!/usr/bin/env bash
# Ejecutar EN EL VPS (después de ssh), o: ssh usuario@IP 'bash -s' < scripts/deploy-on-server.sh
set -euo pipefail
cd /var/www/jobshour-web
git fetch origin
git checkout master
git reset --hard origin/master
export NODE_OPTIONS="--max-old-space-size=1536"
npm ci --prefer-offline
npm run build
pm2 reload jobshour-web --update-env
echo "=== DEPLOY OK $(date -Iseconds) ==="
pm2 list | head -n 15
