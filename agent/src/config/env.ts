import dotenv from "dotenv";
import os from "os";

dotenv.config();

const parseCsv = (value: string | undefined) =>
  (value ?? "")
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);

export const env = {
  nodeEnv: process.env.NODE_ENV ?? "development",
  port: Number(process.env.AGENT_PORT ?? 4100),
  apiKey: process.env.AGENT_API_KEY ?? "change-this-agent-key",
  agentVersion: process.env.AGENT_VERSION ?? "1.0.0",
  allowedOrigins: parseCsv(process.env.ALLOWED_ORIGINS),
  allowedIps: parseCsv(process.env.ALLOWED_IPS),
  checkinIntervalSeconds: Number(process.env.CHECKIN_INTERVAL_SECONDS ?? 60),
  dashboardUrl: process.env.DASHBOARD_URL ?? "",
  machineName: process.env.MACHINE_NAME ?? os.hostname()
};
