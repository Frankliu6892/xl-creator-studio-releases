$ErrorActionPreference = "SilentlyContinue"
$AppDir = Split-Path -Parent $MyInvocation.MyCommand.Path

$StandaloneExe = Join-Path $AppDir "dist\win-unpacked\XL Creator Studio.exe"
if (Test-Path $StandaloneExe) {
  Start-Process -FilePath $StandaloneExe -WorkingDirectory (Split-Path -Parent $StandaloneExe)
  exit 0
}

$ElectronExe = Join-Path $AppDir "node_modules\electron\dist\electron.exe"
if (Test-Path $ElectronExe) {
  Start-Process -FilePath $ElectronExe -ArgumentList "`"$AppDir`"" -WorkingDirectory $AppDir
  exit 0
}
