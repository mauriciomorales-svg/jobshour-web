# Desde tu PC (PowerShell), sin GitHub Actions:
#   cd c:\wamp64\www\jobshour-web
#   .\scripts\deploy-from-windows.ps1 -Server "IP_O_DOMINIO"
# Usuario distinto de root:
#   .\scripts\deploy-from-windows.ps1 -Server "IP" -User "ubuntu"
param(
  [Parameter(Mandatory = $true)][string]$Server,
  [string]$User = "root"
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

$target = "${User}@${Server}"
Write-Host "Conectando a $target y ejecutando deploy..."
$body | ssh -o ConnectTimeout=20 $target "bash -s"
Write-Host "Listo."
