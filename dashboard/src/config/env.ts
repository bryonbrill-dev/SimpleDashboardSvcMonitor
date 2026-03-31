import dotenv from "dotenv";

dotenv.config();

export const env = {
  nodeEnv: process.env.NODE_ENV ?? "development",
  port: Number(process.env.DASHBOARD_PORT ?? 4200),
  databaseUrl: process.env.DATABASE_URL ?? "file:./dev.db",
  sessionSecret: process.env.SESSION_SECRET ?? "change-this-secret",
  defaultAdminUsername: process.env.DEFAULT_ADMIN_USERNAME ?? "admin",
  defaultAdminPassword: process.env.DEFAULT_ADMIN_PASSWORD ?? "Admin@123",
  pollIntervalSeconds: Number(process.env.POLL_INTERVAL_SECONDS ?? 60),
  appBaseUrl: process.env.APP_BASE_URL ?? "http://localhost:4200"
};
