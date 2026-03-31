export const SERVICE_STATUS = {
  UP: "UP",
  DOWN: "DOWN",
  UNKNOWN: "UNKNOWN",
  REMOVED: "REMOVED"
} as const;

export type ServiceStatus = (typeof SERVICE_STATUS)[keyof typeof SERVICE_STATUS];

export const EVENT_TYPE = {
  INFO: "INFO",
  DOWN: "DOWN",
  RESTORED: "RESTORED",
  UNREACHABLE: "UNREACHABLE",
  CONFIG: "CONFIG"
} as const;

export type EventType = (typeof EVENT_TYPE)[keyof typeof EVENT_TYPE];
