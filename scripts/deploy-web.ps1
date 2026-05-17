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

Write-Host '>> Generar firebase-messaging-sw.js desde .env.local...'
node (Join-Path $Project 'scripts\generate-firebase-sw.mjs')

Write-Host '>> Build Next.js (WSL) con Firebase/VAPID del .env.local...'
wsl -e bash -lc @"
cd /mnt/c/wamp64/www/jobshour-web && mkdir -p /tmp/jobshour-next-build && \
export SKIP_TS_CHECK=true TMPDIR=/tmp/jobshour-next-build NODE_OPTIONS=--max-old-space-size=6144 NODE_ENV=production \
NEXT_PUBLIC_API_URL=https://jobshours.com/api \
INTERNAL_API_ORIGIN=http://127.0.0.1:8095 \
INTERNAL_INVENTARIO_ORIGIN=http://127.0.0.1:8003 && \
$firebaseBlock \
npm run build
"@

if (-not (Test-Path (Join-Path $Project '.next\BUILD_ID'))) {
  throw 'Build incompleto: falta .next/BUILD_ID. No subir al VPS (evita 502 en jobshours.com).'
}
Write-Host ">> BUILD_ID: $(Get-Content (Join-Path $Project '.next\BUILD_ID'))"

Write-Host '>> Empaquetar .next...'
$localTgz = Join-Path $env:LOCALAPPDATA 'Temp\jobshour-next.tgz'
if (Get-Command tar -ErrorAction SilentlyContinue) {
  tar -czf $localTgz -C $Project .next
} else {
  Write-Host '>> Empaquetar .next en WSL /tmp...'
  wsl -e bash -lc 'tar czf /tmp/jobshour-next.tgz -C /mnt/c/wamp64/www/jobshour-web .next'
  if (-not (Test-Path $localTgz)) {
    Write-Host ">> Copiar a $localTgz ..."
    wsl -e bash -lc "cp /tmp/jobshour-next.tgz /mnt/c/Users/ComercioIsabel/AppData/Local/Temp/jobshour-next.tgz"
  }
}
tar -tzf $localTgz 2>$null | Select-String '\.next/BUILD_ID' | Out-Null
if (-not $?) { throw 'El tarball no contiene .next/BUILD_ID' }

Write-Host '>> SCP al VPS...'
scp -F $SshConfig $localTgz "${Remote}:/tmp/jobshour-next.tgz"

Write-Host '>> Actualizar .env.local y firebase-messaging-sw.js en VPS...'
$localEnv = Join-Path $Project '.env.local'
if (Test-Path $localEnv) {
  scp -F $SshConfig $localEnv "${Remote}:${RemotePath}/.env.local"
}
foreach ($rel in @('public\sw.js', 'public\sw-register.js', 'public\sw-fcm.generated.js', 'public\firebase-messaging-sw.js')) {
  $f = Join-Path $Project $rel
  if (Test-Path $f) {
    $remoteRel = $rel -replace '\\', '/'
    scp -F $SshConfig $f "${Remote}:${RemotePath}/$remoteRel"
  }
}

Write-Host '>> Extraer y reiniciar PM2...'
ssh -F $SshConfig $Remote "cd $RemotePath && rm -rf .next && tar xzf /tmp/jobshour-next.tgz && test -f .next/BUILD_ID && pm2 reload jobshour-web --update-env || pm2 start jobshour-web --update-env"

Write-Host '>> Listo.'
