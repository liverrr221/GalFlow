param(
  [string]$InstallDir = ""
)

$ErrorActionPreference = "Stop"

if (-not $InstallDir) {
  if (Test-Path (Join-Path $PSScriptRoot "GalFlow.exe")) {
    $InstallDir = $PSScriptRoot
  } else {
    $InstallDir = Join-Path $env:LOCALAPPDATA "Programs\GalFlow"
  }
}

$desktop = [Environment]::GetFolderPath("Desktop")
$startMenuDir = Join-Path $env:APPDATA "Microsoft\Windows\Start Menu\Programs\GalFlow"
$uninstallKey = "HKCU:\Software\Microsoft\Windows\CurrentVersion\Uninstall\GalFlow"

Get-Process GalFlow -ErrorAction SilentlyContinue | Stop-Process -Force

Remove-Item (Join-Path $desktop "GalFlow.lnk") -Force -ErrorAction SilentlyContinue
Remove-Item $startMenuDir -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item $uninstallKey -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item $InstallDir -Recurse -Force -ErrorAction SilentlyContinue

Write-Host "GalFlow has been removed from this computer."
Write-Host "Your story data in %APPDATA%\GalFlow was preserved."
