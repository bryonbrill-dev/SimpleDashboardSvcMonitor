import { Router } from "express";
import os from "os";
import { z } from "zod";
import { env } from "../config/env";
import { getServiceByName, listServices } from "../services/windowsServiceReader";
import { logger } from "../utils/logger";

const checkinSchema = z.object({
  source: z.string().optional(),
  notes: z.string().optional()
});

export const apiRouter = Router();

apiRouter.get("/health", (_req, res) => {
  res.json({
    ok: true,
    machineName: env.machineName,
    host: os.hostname(),
    agentVersion: env.agentVersion,
    timestamp: new Date().toISOString()
  });
});

apiRouter.get("/services", async (_req, res) => {
  try {
    const services = await listServices();
    res.json({ machineName: env.machineName, count: services.length, services });
  } catch (error) {
    logger.error({ error }, "Failed to list services");
    res.status(500).json({ error: "Unable to query services" });
  }
});

apiRouter.get("/services/:serviceName", async (req, res) => {
  try {
    const service = await getServiceByName(req.params.serviceName);
    if (!service) {
      res.status(404).json({ error: "Service not found" });
      return;
    }
    res.json(service);
  } catch (error) {
    logger.error({ error, serviceName: req.params.serviceName }, "Failed to query service");
    res.status(500).json({ error: "Unable to query service" });
  }
});

apiRouter.post("/checkin", (req, res) => {
  const parsed = checkinSchema.safeParse(req.body ?? {});
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  logger.info({ payload: parsed.data }, "Agent check-in received");
  res.json({
    ok: true,
    machineName: env.machineName,
    agentVersion: env.agentVersion,
    checkedAt: new Date().toISOString()
  });
});
