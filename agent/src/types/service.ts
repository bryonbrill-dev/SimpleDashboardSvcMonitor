export type ServiceStatus = "UP" | "DOWN" | "UNKNOWN";

export interface ServiceInfo {
  machineName: string;
  serviceName: string;
  displayName: string;
  status: ServiceStatus;
  lastCheckedAt: string;
  agentVersion: string;
}
