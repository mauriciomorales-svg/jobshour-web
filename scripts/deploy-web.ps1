# Build en WSL y subida de .next al VPS (evita pipe lento WSL->SSH sobre /mnt/c)
$ErrorActionPreference = 'Stop'
$SshConfig = "$env:USERPROFILE\.ssh\config"
$Remote = 'jobshours-droplet'
$RemotePath = '/var/www/jobshour-web'
$Project = 'C:\wamp64\www\jobshour-web'

function Get-EnvExportsFromFile {
  param([string]$FilePath)
  $exports = @()
  if (-not (Test-Path $FilePath)) { return $exports }
  Get-Content $FilePath | ForEach-Object {
    $line = $_.Trim()
    if ($line -eq '' -or $line.StartsWith('#')) { return }
    if ($line -match '^(NEXT_PUBLIC_[A-Z0-9_]+)=(.*)$') {
      $key = $Matches[1]
      $val = $Matches[2].Trim().Trim('"').Trim("'")
      if ($val) { $exports += "export $key=`"$val`"" }
    }
  }
  return $exports
}

$firebaseExports = @(
  (Get-EnvExportsFromFile (Join-Path $Project '.env.local'))
  (Get-EnvExportsFromFile (Join-Path $Project '.env.production'))
) | Select-Object -Unique

$firebaseBlock = if ($firebaseExports.Count -gt 0) {
  ($firebaseExports -join " && ") + ' && '
} else {
  ''
}

Write-Host '>> Build Next.js (WSL) con Firebase/VAPID del .env.local...'
wsl -e bash -lc @"
cd /mnt/c/wamp64/www/jobshour-web && mkdir -p /tmp/jobshour-next-build && \
export TMPDIR=/tmp/jobshour-next-build NODE_OPTIONS=--max-old-space-size=6144 NODE_ENV=production \
NEXT_PUBLIC_API_URL=https://jobshours.com/api \
INTERNAL_API_ORIGIN=http://127.0.0.1:8095 \
INTERNAL_INVENTARIO_ORIGIN=http://127.0.0.1:8003 && \
$firebaseBlock \
npm run build
"@

Write-Host '>> Empaquetar .next en WSL /tmp...'
wsl -e bash -lc 'tar czf /tmp/jobshour-next.tgz -C /mnt/c/wamp64/www/jobshour-web .next'

$localTgz = Join-Path $env:LOCALAPPDATA 'Temp\jobshour-next.tgz'
Write-Host ">> Copiar a $localTgz ..."
wsl -e bash -lc "cp /tmp/jobshour-next.tgz /mnt/c/Users/ComercioIsabel/AppData/Local/Temp/jobshour-next.tgz"

Write-Host '>> SCP al VPS...'
scp -F $SshConfig $localTgz "${Remote}:/tmp/jobshour-next.tgz"

Write-Host '>> Actualizar .env.local en VPS (Firebase/VAPID)...'
$localEnv = Join-Path $Project '.env.local'
if (Test-Path $localEnv) {
  scp -F $SshConfig $localEnv "${Remote}:${RemotePath}/.env.local"
}

Write-Host '>> Extraer y reiniciar PM2...'
ssh -F $SshConfig $Remote "cd $RemotePath && rm -rf .next && tar xzf /tmp/jobshour-next.tgz && pm2 reload jobshour-web --update-env || pm2 start jobshour-web --update-env"

Write-Host '>> Listo.'
