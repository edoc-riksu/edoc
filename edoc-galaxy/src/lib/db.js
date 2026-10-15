import { PrismaClient } from "@prisma/client";

// Reuse one client across hot reloads in dev so each edit doesn't open a
// fresh pool of Postgres connections.
const globalForPrisma = globalThis;

export const db = globalForPrisma.prisma || new PrismaClient();

if (process.env.APP_ENV !== "production") {
  globalForPrisma.prisma = db;
}
