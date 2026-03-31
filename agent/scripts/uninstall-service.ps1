param([string]$WorkingDir = (Split-Path -Parent $PSScriptRoot))
Set-Location $WorkingDir
node .\scripts\uninstall-service.js
