# Desde tu PC (PowerShell), sin GitHub Actions:
#   cd c:\wamp64\www\jobshour-web
#   .\scripts\deploy-from-windows.ps1 -Server "IP_O_DOMINIO"
# Usuario distinto de root:
#   .\scripts\deploy-from-windows.ps1 -Server "IP" -User "ubuntu"
# Rama (debe existir en origin en el VPS):
#   .\scripts\deploy-from-windows.ps1 -Server "IP" -Branch "main"
param(
  [Parameter(Mandatory = $true)][string]$Server,
  [string]$User = "root",
  [string]$Branch = "master"
)

$ErrorActionPreference = "Stop"
$scriptPath = Join-Path $PSScriptRoot "deploy-on-server.sh"
if (-not (Test-Path -LiteralPath $scriptPath)) {
  throw "No se encuentra $scriptPath"
}

# CRLF rompe bash en Linux; normalizar a LF antes de enviar por SSH
$body = [System.IO.File]::ReadAllText($scriptPath)
$body = $body -replace "`r`n", "`n"
$body = $body -replace "`r", "`n"

$qBranch = $Branch -replace "'", "'\''"
$body = "export DEPLOY_BRANCH='$qBranch'`n$body"

$target = "${User}@${Server}"
Write-Host "Conectando a $target y ejecutando deploy (rama: $Branch)..."
$body | ssh -o ConnectTimeout=20 $target "bash -s"
Write-Host "Listo."
