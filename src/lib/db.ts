import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const g = globalThis as unknown as { prisma?: PrismaClient };

function createClient() {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! , max: 5  });
  return new PrismaClient({ adapter , transactionOptions: { maxWait: 20000, timeout: 30000 },});
}

export const db = g.prisma ?? createClient();
if (process.env.NODE_ENV !== "production") g.prisma = db;