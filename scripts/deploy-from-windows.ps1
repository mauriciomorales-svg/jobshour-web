# Desde tu PC (PowerShell), sin GitHub Actions:
#   cd c:\wamp64\www\jobshour-web
#   .\scripts\deploy-from-windows.ps1 -Server "IP_O_DOMINIO"
# Alias definido en ~/.ssh/config (Host jobshours-droplet + IdentityFile):
#   .\scripts\deploy-from-windows.ps1 -SshConfigHost "jobshours-droplet"
# Usuario distinto de root:
#   .\scripts\deploy-from-windows.ps1 -Server "IP" -User "ubuntu"
# Rama (debe existir en origin en el VPS):
#   .\scripts\deploy-from-windows.ps1 -Server "IP" -Branch "main"
param(
  [string]$Server = "",
  [string]$User = "root",
  [string]$Branch = "master",
  [string]$SshConfigHost = ""
)

$ErrorActionPreference = "Stop"
$scriptPath = Join-Path $PSScriptRoot "deploy-on-server.sh"
if (-not (Test-Path -LiteralPath $scriptPath)) {
  throw "No se encuentra $scriptPath"
}

# CRLF rompe bash en Linux ($'\r'); quitar todos los CR y usar solo LF
$body = ([System.IO.File]::ReadAllText($scriptPath) -replace "`r", "").TrimEnd() + "`n"

$qBranch = $Branch -replace "'", "'\''"
$body = (("export DEPLOY_BRANCH='$qBranch'`n" + $body) -replace "`r", "").TrimEnd() + "`n"

if ($SshConfigHost -ne "") {
  $target = $SshConfigHost
} elseif ($Server -ne "") {
  $target = "${User}@${Server}"
} else {
  throw "Indica -Server 'host_o_ip' o -SshConfigHost 'alias' (ver ~/.ssh/config)."
}

Write-Host "Conectando a $target y ejecutando deploy (rama: $Branch)..."
$sshConfig = Join-Path $env:USERPROFILE '.ssh\config'
if (Test-Path -LiteralPath $sshConfig) {
  $body | ssh -F $sshConfig -o ConnectTimeout=60 $target "bash -s"
} else {
  $body | ssh -o ConnectTimeout=60 $target "bash -s"
}
Write-Host "Listo."
