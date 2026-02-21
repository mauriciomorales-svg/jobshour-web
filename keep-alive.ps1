while ($true) {
    $port = Get-NetTCPConnection -LocalPort 3002 -State Listen -ErrorAction SilentlyContinue
    if (-not $port) {
        Start-Process npm -ArgumentList "run","dev" -WorkingDirectory "C:\wamp64\www\jobshour-web" -WindowStyle Hidden
    }
    Start-Sleep 30
}
