import { EVENT_TYPE, SERVICE_STATUS, ServiceStatus } from "../types/monitoring";
import fetch from "node-fetch";
import { prisma } from "../config/prisma";

function toStatus(value?: string): ServiceStatus {
  const normalized = (value ?? "").toUpperCase();
  if (normalized === "UP") return SERVICE_STATUS.UP;
  if (normalized === "DOWN") return SERVICE_STATUS.DOWN;
  return SERVICE_STATUS.UNKNOWN;
}

export async function pollMachine(machineId: number): Promise<void> {
  const machine = await prisma.machine.findUnique({
    where: { id: machineId },
    include: { services: { where: { isActive: true } } }
  });
  if (!machine || !machine.isActive) return;

  const pollRun = await prisma.pollRun.create({ data: { machineId: machine.id, success: false } });
  const baseUrl = `http://${machine.host}:${machine.port}`;

  try {
    const healthResponse = await fetch(`${baseUrl}/api/health`, {
      headers: { "x-api-key": machine.apiKey }
    });

    if (!healthResponse.ok) {
      throw new Error(`Health failed: HTTP ${healthResponse.status}`);
    }

    for (const svc of machine.services) {
      let status = SERVICE_STATUS.UNKNOWN;
      let reachable = true;
      let errorMessage: string | undefined;
      try {
        const serviceResp = await fetch(
          `${baseUrl}/api/services/${encodeURIComponent(svc.serviceName)}`,
          { headers: { "x-api-key": machine.apiKey } }
        );

        if (serviceResp.status === 404) {
          status = SERVICE_STATUS.DOWN;
          errorMessage = "Service not found on agent";
        } else if (!serviceResp.ok) {
          throw new Error(`Service lookup failed: HTTP ${serviceResp.status}`);
        } else {
          const payload = (await serviceResp.json()) as { status: string };
          status = toStatus(payload.status);
        }
      } catch (error) {
        reachable = false;
        status = SERVICE_STATUS.DOWN;
        errorMessage = error instanceof Error ? error.message : "Unknown polling error";
      }

      const changed = svc.currentStatus !== status;
      const now = new Date();

      await prisma.monitoredService.update({
        where: { id: svc.id },
        data: {
          currentStatus: status,
          lastCheckedAt: now,
          lastStateChangeAt: changed ? now : svc.lastStateChangeAt ?? now
        }
      });

      await prisma.serviceStatusHistory.create({
        data: {
          monitoredServiceId: svc.id,
          status,
          isReachable: reachable,
          errorMessage
        }
      });

      if (changed) {
        const eventType = status === SERVICE_STATUS.DOWN ? EVENT_TYPE.DOWN : EVENT_TYPE.RESTORED;
        await prisma.eventLog.create({
          data: {
            machineId: machine.id,
            monitoredServiceId: svc.id,
            eventType,
            message: `${svc.serviceName} changed to ${status}`
          }
        });
      }
    }

    await prisma.pollRun.update({
      where: { id: pollRun.id },
      data: { success: true, completedAt: new Date() }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Poll failed";
    await prisma.pollRun.update({
      where: { id: pollRun.id },
      data: { success: false, completedAt: new Date(), errorMessage: message }
    });
    await prisma.eventLog.create({
      data: {
        machineId: machine.id,
        eventType: EVENT_TYPE.UNREACHABLE,
        message: `Machine poll failed: ${message}`
      }
    });
  }
}

export async function pollAllActiveMachines(): Promise<void> {
  const machines = await prisma.machine.findMany({ where: { isActive: true } });
  for (const machine of machines) {
    // TODO: fan-out workers for higher scale.
    await pollMachine(machine.id);
  }
}
