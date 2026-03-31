import dotenv from "dotenv";
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";
import { SERVICE_STATUS } from "../src/types/monitoring";

dotenv.config();
const prisma = new PrismaClient();

async function main() {
  const username = process.env.DEFAULT_ADMIN_USERNAME ?? "admin";
  const password = process.env.DEFAULT_ADMIN_PASSWORD ?? "Admin@123";

  const passwordHash = await bcrypt.hash(password, 10);
  await prisma.user.upsert({
    where: { username },
    update: {},
    create: { username, passwordHash }
  });

  const machine = await prisma.machine.upsert({
    where: { id: 1 },
    update: {},
    create: {
      name: "Sample Agent",
      host: "127.0.0.1",
      port: 4100,
      apiKey: "change-this-agent-key",
      isActive: false
    }
  });

  await prisma.monitoredService.upsert({
    where: { id: 1 },
    update: {},
    create: {
      machineId: machine.id,
      serviceName: "Spooler",
      displayName: "Print Spooler",
      currentStatus: SERVICE_STATUS.UNKNOWN,
      isActive: false
    }
  });

  console.log("Seed complete");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
