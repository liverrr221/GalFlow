$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$source = Join-Path $root "release\GalFlow-win32-x64"
$installDir = Join-Path $env:LOCALAPPDATA "Programs\GalFlow"
$exePath = Join-Path $installDir "GalFlow.exe"
$desktop = [Environment]::GetFolderPath("Desktop")
$startMenuDir = Join-Path $env:APPDATA "Microsoft\Windows\Start Menu\Programs\GalFlow"
$uninstallKey = "HKCU:\Software\Microsoft\Windows\CurrentVersion\Uninstall\GalFlow"
$uninstallScript = Join-Path $installDir "Uninstall.ps1"

if (-not (Test-Path (Join-Path $source "GalFlow.exe"))) {
  throw "Packaged app not found. Run 'npm run desktop:build' first."
}

Get-Process GalFlow -ErrorAction SilentlyContinue | Stop-Process -Force

New-Item -ItemType Directory -Force -Path $installDir | Out-Null
Copy-Item (Join-Path $source "*") $installDir -Recurse -Force

$shell = New-Object -ComObject WScript.Shell

$desktopShortcut = $shell.CreateShortcut((Join-Path $desktop "GalFlow.lnk"))
$desktopShortcut.TargetPath = $exePath
$desktopShortcut.WorkingDirectory = $installDir
$desktopShortcut.IconLocation = "$exePath,0"
$desktopShortcut.Description = "GalFlow story flow editor"
$desktopShortcut.Save()

New-Item -ItemType Directory -Force -Path $startMenuDir | Out-Null
$menuShortcut = $shell.CreateShortcut((Join-Path $startMenuDir "GalFlow.lnk"))
$menuShortcut.TargetPath = $exePath
$menuShortcut.WorkingDirectory = $installDir
$menuShortcut.IconLocation = "$exePath,0"
$menuShortcut.Description = "GalFlow story flow editor"
$menuShortcut.Save()

Copy-Item (Join-Path $PSScriptRoot "uninstall-local.ps1") $uninstallScript -Force

New-Item -Path $uninstallKey -Force | Out-Null
Set-ItemProperty -Path $uninstallKey -Name "DisplayName" -Value "GalFlow"
Set-ItemProperty -Path $uninstallKey -Name "DisplayIcon" -Value $exePath
Set-ItemProperty -Path $uninstallKey -Name "DisplayVersion" -Value "0.1.0"
Set-ItemProperty -Path $uninstallKey -Name "Publisher" -Value "GalFlow"
Set-ItemProperty -Path $uninstallKey -Name "InstallLocation" -Value $installDir
Set-ItemProperty -Path $uninstallKey -Name "UninstallString" -Value "powershell -NoProfile -ExecutionPolicy Bypass -File `"$uninstallScript`""
Set-ItemProperty -Path $uninstallKey -Name "NoModify" -Value 1 -Type DWord
Set-ItemProperty -Path $uninstallKey -Name "NoRepair" -Value 1 -Type DWord

Write-Host "GalFlow installed to: $installDir"
Write-Host "Desktop shortcut: $(Join-Path $desktop 'GalFlow.lnk')"
Write-Host "Start menu shortcut: $(Join-Path $startMenuDir 'GalFlow.lnk')"
