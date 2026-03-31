import cors from "cors";
import express from "express";
import helmet from "helmet";
import pinoHttp from "pino-http";
import { apiRouter } from "./routes/api";
import { env } from "./config/env";
import { logger } from "./utils/logger";
import { requireApiKey } from "./middleware/auth";

const app = express();

const corsOrigins = env.allowedOrigins.includes("*") || env.allowedOrigins.length === 0 ? true : env.allowedOrigins;

app.use(helmet());
app.use(cors({ origin: corsOrigins }));
app.use(express.json());
app.use(pinoHttp({ logger }));

app.use((req, res, next) => {
  if (env.allowedIps.length === 0) {
    next();
    return;
  }
  const ip = req.ip.replace("::ffff:", "");
  if (!env.allowedIps.includes(ip)) {
    res.status(403).json({ error: "Forbidden IP" });
    return;
  }
  next();
});

app.use("/api", requireApiKey, apiRouter);

app.listen(env.port, () => {
  logger.info({ port: env.port }, "Windows Agent service running");
});

setInterval(() => {
  logger.debug({ machineName: env.machineName }, "Agent heartbeat tick");
}, env.checkinIntervalSeconds * 1000);
