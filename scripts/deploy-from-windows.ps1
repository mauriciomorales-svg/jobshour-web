# Desde tu PC (PowerShell): despliega al VPS sin GitHub Actions.
# Desde la raíz del repo:
#   .\scripts\deploy-from-windows.ps1 -Server "TU_IP_O_DOMINIO"
param(
  [Parameter(Mandatory = $true)][string]$Server
)
$scriptPath = Join-Path $PSScriptRoot "deploy-on-server.sh"
Get-Content -LiteralPath $scriptPath -Raw | ssh "root@${Server}" "bash -s"
