import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"]
  });

globalForPrisma.prisma = prisma;

export async function tryDb<T>(operation: () => Promise<T>): Promise<T | null> {
  if (!process.env.DATABASE_URL) return null;

  try {
    return await operation();
  } catch (error) {
    console.warn("Database operation fell back to demo memory store:", error);
    return null;
  }
}
