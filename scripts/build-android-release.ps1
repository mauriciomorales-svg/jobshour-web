# Compila APK release (unsigned) desde la raíz del repo jobshour-web.
# Requisitos: Android SDK (ANDROID_HOME), JDK 21 (Capacitor 7).
# Uso:  cd c:\wamp64\www\jobshour-web
#       .\scripts\build-android-release.ps1

$ErrorActionPreference = "Stop"
$Root = Split-Path $PSScriptRoot -Parent

Set-Location $Root

function Find-Jdk21 {
  if ($env:JAVA_HOME -and (Test-Path "$env:JAVA_HOME\bin\java.exe")) {
    $out = & "$env:JAVA_HOME\bin\java.exe" -version 2>&1 | Out-String
    if ($out -match 'version "21') { return $env:JAVA_HOME }
  }
  $ms = Get-ChildItem "C:\Program Files\Microsoft" -Directory -Filter "jdk-21*" -ErrorAction SilentlyContinue | Sort-Object Name -Descending | Select-Object -First 1
  if ($ms -and (Test-Path "$($ms.FullName)\bin\java.exe")) { return $ms.FullName }
  $adopt = Get-ChildItem "C:\Program Files\Eclipse Adoptium" -Directory -Filter "jdk-21*" -ErrorAction SilentlyContinue | Sort-Object Name -Descending | Select-Object -First 1
  if ($adopt -and (Test-Path "$($adopt.FullName)\bin\java.exe")) { return $adopt.FullName }
  throw "No se encontró JDK 21. Instala con: winget install Microsoft.OpenJDK.21"
}

$jdk = Find-Jdk21
$env:JAVA_HOME = $jdk
$env:ANDROID_HOME = if ($env:ANDROID_HOME) { $env:ANDROID_HOME } else { "$env:LOCALAPPDATA\Android\Sdk" }
if (-not (Test-Path $env:ANDROID_HOME)) {
  throw "ANDROID_HOME no válido: $($env:ANDROID_HOME)"
}

Write-Host "JAVA_HOME=$env:JAVA_HOME"
Write-Host "ANDROID_HOME=$env:ANDROID_HOME"

npx cap sync android

$android = Join-Path $Root "android"
Set-Location $android
& .\gradlew.bat assembleRelease --no-daemon

$apkSrc = Join-Path $Root "android\app\build\outputs\apk\release\app-release-unsigned.apk"
if (-not (Test-Path $apkSrc)) { throw "No se generó el APK: $apkSrc" }

$outDir = Join-Path $Root "releases"
New-Item -ItemType Directory -Force -Path $outDir | Out-Null
$ver = (Select-String -Path (Join-Path $Root "android\app\build.gradle") -Pattern 'versionName\s+"([^"]+)"').Matches.Groups[1].Value
$code = (Select-String -Path (Join-Path $Root "android\app\build.gradle") -Pattern 'versionCode\s+(\d+)').Matches.Groups[1].Value
$dest = Join-Path $outDir "JobsHours-v$ver-$code-release-unsigned.apk"
Copy-Item $apkSrc $dest -Force

Write-Host ""
Write-Host "OK: $dest"
Write-Host "Nota: APK sin firmar. Para Play Console usa Android Studio: Build > Generate Signed Bundle / APK, o configura signing en android/app/build.gradle."
