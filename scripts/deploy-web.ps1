# Build en WSL y subida de .next al VPS (evita pipe lento WSL->SSH sobre /mnt/c)
$ErrorActionPreference = 'Stop'
$Project = 'C:\wamp64\www\jobshour-web'
$SshConfig = "$env:USERPROFILE\.ssh\config"
$Remote = 'jobshours-droplet'
$RemotePath = '/var/www/jobshour-web'

Write-Host '>> Build Next.js (WSL)...'
wsl -e bash -lc @"
cd /mnt/c/wamp64/www/jobshour-web && mkdir -p /tmp/jobshour-next-build && \
export TMPDIR=/tmp/jobshour-next-build NODE_OPTIONS=--max-old-space-size=6144 NODE_ENV=production \
NEXT_PUBLIC_API_URL=https://jobshours.com/api \
INTERNAL_API_ORIGIN=http://127.0.0.1:8095 \
INTERNAL_INVENTARIO_ORIGIN=http://127.0.0.1:8003 && \
npm run build
"@

Write-Host '>> Empaquetar .next en WSL /tmp...'
wsl -e bash -lc 'tar czf /tmp/jobshour-next.tgz -C /mnt/c/wamp64/www/jobshour-web .next'

$localTgz = Join-Path $env:LOCALAPPDATA 'Temp\jobshour-next.tgz'
Write-Host ">> Copiar a $localTgz ..."
wsl -e bash -lc "cp /tmp/jobshour-next.tgz /mnt/c/Users/ComercioIsabel/AppData/Local/Temp/jobshour-next.tgz"

Write-Host '>> SCP al VPS...'
scp -F $SshConfig $localTgz "${Remote}:/tmp/jobshour-next.tgz"

Write-Host '>> Extraer y reiniciar PM2...'
ssh -F $SshConfig $Remote "cd $RemotePath && rm -rf .next && tar xzf /tmp/jobshour-next.tgz && pm2 reload jobshour-web --update-env || pm2 start jobshour-web --update-env"

Write-Host '>> Listo.'
