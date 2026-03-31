import { ServiceStatus } from "../types/monitoring";

export function statusBadgeClass(status: ServiceStatus) {
  switch (status) {
    case "UP":
      return "badge-success";
    case "DOWN":
      return "badge-danger";
    case "REMOVED":
      return "badge-secondary";
    default:
      return "badge-warning";
  }
}
