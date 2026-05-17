#!/usr/bin/env bash
set -euo pipefail
cd /var/www/jobshour-web
LOG=/var/log/jobshours-web-build.log

exec > >(tee -a "$LOG") 2>&1
echo "=== build start $(date -Is) ==="

pm2 stop jobshour-web dondemorales-web diariovirtual-web dondemorales-api jobshour-horizon jobshour-reverb jobshour-queue 2>/dev/null || true
sleep 2

if ! swapon --show | grep -q swapfile2; then
  [ -f /swapfile2 ] || { fallocate -l 2G /swapfile2 2>/dev/null || dd if=/dev/zero of=/swapfile2 bs=1M count=2048; chmod 600 /swapfile2; mkswap /swapfile2; }
  swapon /swapfile2 2>/dev/null || true
fi

free -h
rm -rf .next
mkdir -p /tmp/next-cache
export TMPDIR=/tmp

export NODE_OPTIONS="--max-old-space-size=768"
export NODE_ENV=production
export NEXT_TELEMETRY_DISABLED=1
export NEXT_PUBLIC_API_URL="${NEXT_PUBLIC_API_URL:-https://jobshours.com/api}"
export INTERNAL_API_ORIGIN="${INTERNAL_API_ORIGIN:-http://127.0.0.1:8095}"
export INTERNAL_INVENTARIO_ORIGIN="${INTERNAL_INVENTARIO_ORIGIN:-http://127.0.0.1:8003}"
export NEXT_PUBLIC_PUSHER_KEY="${NEXT_PUBLIC_PUSHER_KEY:-9a309a9f35c89457ea2c}"
export NEXT_PUBLIC_PUSHER_CLUSTER="${NEXT_PUBLIC_PUSHER_CLUSTER:-us2}"

npm run build

test -f .next/BUILD_ID
echo "BUILD_ID=$(cat .next/BUILD_ID)"

pm2 reload jobshour-web --update-env
pm2 start dondemorales-web diariovirtual-web dondemorales-api jobshour-horizon jobshour-reverb jobshour-queue 2>/dev/null || true
pm2 save

sleep 5
curl -s -o /dev/null -w "HTTP=%{http_code}\n" --max-time 15 http://127.0.0.1:3000/
echo "=== build end $(date -Is) ==="
