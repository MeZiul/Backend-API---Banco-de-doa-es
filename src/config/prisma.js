import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

let prismaInstance = null;

export function getDatabaseUrl() {
  const url =
    process.env.NODE_ENV === "test"
      ? process.env.TEST_DATABASE_URL || process.env.DATABASE_URL
      : process.env.DATABASE_URL;

  if (!url) {
    throw new Error(
      "DATABASE_URL não foi definida. Copie .env.example para .env e configure o PostgreSQL local.",
    );
  }

  return url;
}

export function getPrisma() {
  if (prismaInstance) return prismaInstance;

  const adapter = new PrismaPg({ connectionString: getDatabaseUrl() });

  prismaInstance = new PrismaClient({
    adapter,
    log:
      process.env.PRISMA_QUERY_LOG === "true"
        ? ["query", "info", "warn", "error"]
        : ["warn", "error"],
  });

  return prismaInstance;
}

export async function disconnectPrisma() {
  if (!prismaInstance) return;
  await prismaInstance.$disconnect();
  prismaInstance = null;
}
