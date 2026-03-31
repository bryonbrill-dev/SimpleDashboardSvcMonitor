-- CreateTable
CREATE TABLE "User" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "username" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

CREATE TABLE "Machine" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "host" TEXT NOT NULL,
    "port" INTEGER NOT NULL,
    "apiKey" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "removedAt" DATETIME
);

CREATE TABLE "MonitoredService" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "machineId" INTEGER NOT NULL,
    "serviceName" TEXT NOT NULL,
    "displayName" TEXT,
    "monitoringStartDate" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "monitoringEndDate" DATETIME,
    "currentStatus" TEXT NOT NULL DEFAULT 'UNKNOWN',
    "lastCheckedAt" DATETIME,
    "lastStateChangeAt" DATETIME,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT "MonitoredService_machineId_fkey" FOREIGN KEY ("machineId") REFERENCES "Machine" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX "MonitoredService_machineId_serviceName_idx" ON "MonitoredService"("machineId", "serviceName");

CREATE TABLE "ServiceStatusHistory" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "monitoredServiceId" INTEGER NOT NULL,
    "checkedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL,
    "isReachable" BOOLEAN NOT NULL,
    "errorMessage" TEXT,
    CONSTRAINT "ServiceStatusHistory_monitoredServiceId_fkey" FOREIGN KEY ("monitoredServiceId") REFERENCES "MonitoredService" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX "ServiceStatusHistory_checkedAt_idx" ON "ServiceStatusHistory"("checkedAt");

CREATE TABLE "PollRun" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "machineId" INTEGER NOT NULL,
    "startedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" DATETIME,
    "success" BOOLEAN NOT NULL DEFAULT false,
    "errorMessage" TEXT,
    CONSTRAINT "PollRun_machineId_fkey" FOREIGN KEY ("machineId") REFERENCES "Machine" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE "EventLog" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "machineId" INTEGER,
    "monitoredServiceId" INTEGER,
    "eventType" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "EventLog_machineId_fkey" FOREIGN KEY ("machineId") REFERENCES "Machine" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "EventLog_monitoredServiceId_fkey" FOREIGN KEY ("monitoredServiceId") REFERENCES "MonitoredService" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE INDEX "EventLog_createdAt_idx" ON "EventLog"("createdAt");
