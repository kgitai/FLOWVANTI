$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot
Set-Location $Root

Write-Host "Installing Python packages..."
py -3 -m pip install --user --upgrade pip pywebview pyinstaller pillow
if ($LASTEXITCODE -ne 0) { throw "pip install failed" }

Write-Host "Building app icon..."
py -3 "$PSScriptRoot\build_icon.py"
if ($LASTEXITCODE -ne 0) { throw "icon build failed" }

Write-Host "Packaging FLOWVANTI.exe..."
$ico = Join-Path $PSScriptRoot "flowvanti.ico"
py -3 -m PyInstaller --noconfirm --clean --windowed --name FLOWVANTI `
  --icon $ico `
  --add-data "dashboard.html;." `
  --add-data "desktop\flowvanti.ico;." `
  --hidden-import webview `
  --hidden-import webview.platforms.edgechromium `
  "$PSScriptRoot\app.py"
if ($LASTEXITCODE -ne 0) { throw "PyInstaller failed" }

$iscc = @(
  "${env:ProgramFiles(x86)}\Inno Setup 6\ISCC.exe",
  "$env:ProgramFiles\Inno Setup 6\ISCC.exe",
  "$env:LOCALAPPDATA\Programs\Inno Setup 6\ISCC.exe"
) | Where-Object { Test-Path $_ } | Select-Object -First 1

if (-not $iscc) {
  Write-Host "Downloading Inno Setup..."
  $tmp = Join-Path $env:TEMP "innosetup-6.exe"
  Invoke-WebRequest -Uri "https://files.jrsoftware.org/is/6/innosetup-6.4.3.exe" -OutFile $tmp
  $innodir = Join-Path $env:LOCALAPPDATA "Programs\Inno Setup 6"
  Start-Process -FilePath $tmp -ArgumentList "/VERYSILENT", "/NORESTART", "/CURRENTUSER", "/DIR=`"$innodir`"" -Wait
  $iscc = Join-Path $innodir "ISCC.exe"
}

if (-not (Test-Path $iscc)) { throw "Inno Setup compiler not found" }

Write-Host "Building Windows installer..."
& $iscc "$PSScriptRoot\FLOWVANTI.iss"
if ($LASTEXITCODE -ne 0) { throw "Inno Setup failed" }

Write-Host "Installer: $Root\dist\FLOWVANTI-Setup.exe"
