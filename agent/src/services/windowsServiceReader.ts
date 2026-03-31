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

const POWERSHELL_BINARIES = ["powershell.exe", "pwsh.exe", "pwsh", "powershell"] as const;

function normalizeStatus(status: string): ServiceStatus {
  const lower = status.toLowerCase();
  if (lower === "running") return "UP";
  if (["stopped", "stop pending", "paused"].includes(lower)) return "DOWN";
  return "UNKNOWN";
}

function extractJsonBlock(rawOutput: string): string {
  const trimmed = rawOutput.trim();
  if (!trimmed) return "[]";
  const start = trimmed.search(/[\[{]/);
  if (start === -1) return "[]";
  return trimmed.slice(start);
}

async function runPowerShell(command: string): Promise<PowerShellService[]> {
  const wrappedCommand = `[Console]::OutputEncoding = [System.Text.Encoding]::UTF8; ${command}`;

  let lastError: unknown;
  for (const shellBinary of POWERSHELL_BINARIES) {
    try {
      const { stdout } = await execFileAsync(
        shellBinary,
        ["-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-Command", wrappedCommand],
        { windowsHide: true, maxBuffer: 1024 * 1024 * 20, encoding: "utf8" }
      );

      const parsed = JSON.parse(extractJsonBlock(stdout)) as PowerShellService[] | PowerShellService;
      if (Array.isArray(parsed)) return parsed;
      return parsed?.Name ? [parsed] : [];
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError ?? new Error("No PowerShell runtime available");
}

function listServicesCommand(): string {
  return "Get-CimInstance Win32_Service | Select-Object Name, DisplayName, State | ForEach-Object { [PSCustomObject]@{ Name = $_.Name; DisplayName = $_.DisplayName; Status = $_.State } } | ConvertTo-Json -Depth 3";
}

function singleServiceCommand(serviceName: string): string {
  const escaped = serviceName.replace(/'/g, "''");
  return `Get-CimInstance Win32_Service -Filter \"Name = '${escaped}'\" | Select-Object Name, DisplayName, State | ForEach-Object { [PSCustomObject]@{ Name = $_.Name; DisplayName = $_.DisplayName; Status = $_.State } } | ConvertTo-Json -Depth 3`;
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
  const result = await runPowerShell(listServicesCommand());
  return result.map(toServiceInfo);
}

export async function getServiceByName(serviceName: string): Promise<ServiceInfo | null> {
  const result = await runPowerShell(singleServiceCommand(serviceName));
  if (!result.length || !result[0]?.Name) return null;
  return toServiceInfo(result[0]);
}
