param(
  [string]$RootPath = "C:\SimpleDashboardSvcMonitor-main"
)

$agentSource = Join-Path $RootPath "agent\.env.example"
$agentTarget = Join-Path $RootPath "agent\.env"
$dashboardSource = Join-Path $RootPath "dashboard\.env.example"
$dashboardTarget = Join-Path $RootPath "dashboard\.env"

if (!(Test-Path $agentSource)) { throw "Missing source file: $agentSource" }
if (!(Test-Path $dashboardSource)) { throw "Missing source file: $dashboardSource" }

Copy-Item -Path $agentSource -Destination $agentTarget -Force
Copy-Item -Path $dashboardSource -Destination $dashboardTarget -Force

Write-Host "Created/updated:"
Write-Host "  $agentTarget"
Write-Host "  $dashboardTarget"
