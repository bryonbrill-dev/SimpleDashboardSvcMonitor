import { ServiceStatus } from "@prisma/client";
import { stringify } from "csv-stringify/sync";
import { Router } from "express";
import { z } from "zod";
import { prisma } from "../config/prisma";
import { requireAuth } from "../middleware/authMiddleware";
import { authenticate } from "../services/authService";
import { statusBadgeClass } from "../utils/status";

const loginSchema = z.object({ username: z.string().min(1), password: z.string().min(1) });
const machineSchema = z.object({
  name: z.string().min(1),
  host: z.string().min(1),
  port: z.coerce.number().int().positive(),
  apiKey: z.string().min(1),
  isActive: z.string().optional()
});
const monitoredServiceSchema = z.object({
  machineId: z.coerce.number().int(),
  discoveredServiceName: z.string().optional(),
  manualServiceName: z.string().optional(),
  displayName: z.string().optional()
});

export const webRouter = Router();

webRouter.use((req, res, next) => {
  res.locals.path = req.path;
  res.locals.badgeClass = statusBadgeClass;
  res.locals.currentUser = req.session.username;
  next();
});

webRouter.get("/login", (req, res) => {
  if (req.session.userId) {
    res.redirect("/");
    return;
  }
  res.render("pages/login", { error: null });
});

webRouter.post("/login", async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).render("pages/login", { error: "Invalid login payload" });
    return;
  }

  const user = await authenticate(parsed.data.username, parsed.data.password);
  if (!user) {
    res.status(401).render("pages/login", { error: "Invalid credentials" });
    return;
  }

  req.session.userId = user.id;
  req.session.username = user.username;
  res.redirect("/");
});

webRouter.post("/logout", requireAuth, (req, res) => {
  req.session.destroy(() => res.redirect("/login"));
});

webRouter.get("/", requireAuth, async (_req, res) => {
  const [machines, services, downCount, upCount, lastPoll, events] = await Promise.all([
    prisma.machine.count({ where: { isActive: true } }),
    prisma.monitoredService.count({ where: { isActive: true } }),
    prisma.monitoredService.count({ where: { isActive: true, currentStatus: ServiceStatus.DOWN } }),
    prisma.monitoredService.count({ where: { isActive: true, currentStatus: ServiceStatus.UP } }),
    prisma.pollRun.findFirst({ where: { success: true }, orderBy: { completedAt: "desc" } }),
    prisma.eventLog.findMany({ take: 10, orderBy: { createdAt: "desc" }, include: { machine: true, monitoredService: true } })
  ]);

  res.render("pages/dashboard", {
    stats: {
      machines,
      services,
      downCount,
      upCount,
      lastPoll: lastPoll?.completedAt
    },
    events
  });
});

webRouter.get("/machines", requireAuth, async (_req, res) => {
  const machines = await prisma.machine.findMany({ orderBy: { createdAt: "desc" } });
  res.render("pages/machines", { machines, error: null });
});

webRouter.post("/machines", requireAuth, async (req, res) => {
  const parsed = machineSchema.safeParse(req.body);
  if (!parsed.success) {
    const machines = await prisma.machine.findMany({ orderBy: { createdAt: "desc" } });
    res.status(400).render("pages/machines", { machines, error: "Invalid machine payload" });
    return;
  }

  await prisma.machine.create({
    data: {
      name: parsed.data.name,
      host: parsed.data.host,
      port: parsed.data.port,
      apiKey: parsed.data.apiKey,
      isActive: !!parsed.data.isActive
    }
  });
  res.redirect("/machines");
});

webRouter.post("/machines/:id/remove", requireAuth, async (req, res) => {
  const id = Number(req.params.id);
  await prisma.machine.update({
    where: { id },
    data: { isActive: false, removedAt: new Date() }
  });
  res.redirect("/machines");
});

webRouter.get("/services", requireAuth, async (_req, res) => {
  const [machines, services] = await Promise.all([
    prisma.machine.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
    prisma.monitoredService.findMany({ include: { machine: true }, orderBy: { monitoringStartDate: "desc" } })
  ]);
  res.render("pages/services", { machines, services, error: null, discoveredServices: [] });
});

webRouter.post("/services/discover", requireAuth, async (req, res) => {
  const machineId = Number(req.body.machineId);
  const [machines, services] = await Promise.all([
    prisma.machine.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
    prisma.monitoredService.findMany({ include: { machine: true }, orderBy: { monitoringStartDate: "desc" } })
  ]);
  const machine = machines.find((m) => m.id === machineId);
  if (!machine) {
    res.status(404).render("pages/services", { machines, services, error: "Machine not found", discoveredServices: [] });
    return;
  }

  try {
    const response = await fetch(`http://${machine.host}:${machine.port}/api/services`, {
      headers: { "x-api-key": machine.apiKey }
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const payload = (await response.json()) as { services: Array<{ serviceName: string; displayName: string }> };
    res.render("pages/services", { machines, services, error: null, discoveredServices: payload.services.slice(0, 100) });
  } catch (error) {
    res.status(500).render("pages/services", {
      machines,
      services,
      error: `Failed to fetch services: ${error instanceof Error ? error.message : "Unknown"}`,
      discoveredServices: []
    });
  }
});

webRouter.post("/services", requireAuth, async (req, res) => {
  const parsed = monitoredServiceSchema.safeParse(req.body);
  if (!parsed.success) {
    const [machines, services] = await Promise.all([
      prisma.machine.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
      prisma.monitoredService.findMany({ include: { machine: true }, orderBy: { monitoringStartDate: "desc" } })
    ]);
    res.status(400).render("pages/services", { machines, services, error: "Invalid service payload", discoveredServices: [] });
    return;
  }

  const resolvedServiceName = (parsed.data.manualServiceName || parsed.data.discoveredServiceName || "").trim();
  if (!resolvedServiceName) {
    const [machines, services] = await Promise.all([
      prisma.machine.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
      prisma.monitoredService.findMany({ include: { machine: true }, orderBy: { monitoringStartDate: "desc" } })
    ]);
    res.status(400).render("pages/services", { machines, services, error: "Provide a discovered or manual service name", discoveredServices: [] });
    return;
  }

  await prisma.monitoredService.create({
    data: {
      machineId: parsed.data.machineId,
      serviceName: resolvedServiceName,
      displayName: parsed.data.displayName || resolvedServiceName,
      isActive: true
    }
  });
  res.redirect("/services");
});

webRouter.post("/services/:id/remove", requireAuth, async (req, res) => {
  await prisma.monitoredService.update({
    where: { id: Number(req.params.id) },
    data: {
      isActive: false,
      monitoringEndDate: new Date(),
      currentStatus: ServiceStatus.REMOVED
    }
  });
  res.redirect("/services");
});

webRouter.get("/history", requireAuth, async (req, res) => {
  const machineId = req.query.machineId ? Number(req.query.machineId) : undefined;
  const status = req.query.status as ServiceStatus | undefined;
  const dateFrom = req.query.dateFrom ? new Date(String(req.query.dateFrom)) : undefined;
  const dateTo = req.query.dateTo ? new Date(String(req.query.dateTo)) : undefined;

  const history = await prisma.serviceStatusHistory.findMany({
    where: {
      status: status || undefined,
      checkedAt: {
        gte: dateFrom,
        lte: dateTo
      },
      monitoredService: machineId ? { machineId } : undefined
    },
    include: {
      monitoredService: { include: { machine: true } }
    },
    orderBy: { checkedAt: "desc" },
    take: 500
  });

  const machines = await prisma.machine.findMany({ orderBy: { name: "asc" } });
  res.render("pages/history", { history, machines, filters: { machineId, status, dateFrom: req.query.dateFrom, dateTo: req.query.dateTo } });
});

webRouter.get("/history/export.csv", requireAuth, async (_req, res) => {
  const history = await prisma.serviceStatusHistory.findMany({
    include: { monitoredService: { include: { machine: true } } },
    orderBy: { checkedAt: "desc" },
    take: 5000
  });

  const csv = stringify(
    history.map((row) => ({
      checkedAt: row.checkedAt.toISOString(),
      machine: row.monitoredService.machine.name,
      service: row.monitoredService.serviceName,
      status: row.status,
      isReachable: row.isReachable,
      errorMessage: row.errorMessage ?? ""
    })),
    { header: true }
  );

  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", "attachment; filename=service-history.csv");
  res.send(csv);
});

webRouter.get("/settings", requireAuth, async (_req, res) => {
  const users = await prisma.user.findMany({ orderBy: { createdAt: "asc" } });
  res.render("pages/settings", { users });
});
