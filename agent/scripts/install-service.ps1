param([string]$WorkingDir = (Split-Path -Parent $PSScriptRoot))
Set-Location $WorkingDir
npm ci
npm run build
node .\scripts\install-service.js
