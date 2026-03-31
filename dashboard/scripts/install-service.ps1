param([string]$WorkingDir = (Split-Path -Parent $PSScriptRoot))
Set-Location $WorkingDir
npm ci
npm run prisma:generate
npx prisma migrate deploy
npm run build
node .\scripts\install-service.js
