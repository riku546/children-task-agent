import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function getDatabaseUrl() {
  const url = process.env.DATABASE_URL;
  if (!url) return undefined;
  if (!url.includes("connection_limit=")) {
    const separator = url.includes("?") ? "&" : "?";
    return `${url}${separator}connection_limit=1`;
  }
  return url;
}

const dbUrl = getDatabaseUrl();

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasources: dbUrl ? { db: { url: dbUrl } } : undefined,
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
