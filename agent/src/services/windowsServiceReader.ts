import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { env } from "../config/env";
import { ServiceInfo, ServiceStatus } from "../types/service";

const execFileAsync = promisify(execFile);

interface PowerShellService {
  Name: string;
  DisplayName: string;
  Status: string;
}

function normalizeStatus(status: string): ServiceStatus {
  const lower = status.toLowerCase();
  if (lower === "running") return "UP";
  if (["stopped", "stop pending", "paused"].includes(lower)) return "DOWN";
  return "UNKNOWN";
}

async function runPowerShell(command: string): Promise<PowerShellService[]> {
  const { stdout } = await execFileAsync(
    "powershell.exe",
    ["-NoProfile", "-NonInteractive", "-Command", command],
    { windowsHide: true, maxBuffer: 1024 * 1024 * 10 }
  );

  const parsed = JSON.parse(stdout.trim() || "[]") as PowerShellService[] | PowerShellService;
  if (Array.isArray(parsed)) return parsed;
  return [parsed];
}

function toServiceInfo(service: PowerShellService): ServiceInfo {
  return {
    machineName: env.machineName,
    serviceName: service.Name,
    displayName: service.DisplayName || service.Name,
    status: normalizeStatus(service.Status),
    lastCheckedAt: new Date().toISOString(),
    agentVersion: env.agentVersion
  };
}

export async function listServices(): Promise<ServiceInfo[]> {
  const result = await runPowerShell(
    "Get-Service | Select-Object Name, DisplayName, Status | ConvertTo-Json -Depth 2"
  );
  return result.map(toServiceInfo);
}

export async function getServiceByName(serviceName: string): Promise<ServiceInfo | null> {
  const escaped = serviceName.replace(/'/g, "''");
  const result = await runPowerShell(
    `Get-Service -Name '${escaped}' -ErrorAction SilentlyContinue | Select-Object Name, DisplayName, Status | ConvertTo-Json -Depth 2`
  );
  if (!result.length || !result[0]?.Name) return null;
  return toServiceInfo(result[0]);
}
