import { AsyncLocalStorage } from "node:async_hooks";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

let prismaInstance = null;
const transactionContext = new AsyncLocalStorage();

export function getDatabaseUrl() {
  const isTest = process.env.NODE_ENV === "test";
  const url = isTest ? process.env.TEST_DATABASE_URL : process.env.DATABASE_URL;

  if (!url) {
    throw new Error(
      isTest
        ? "TEST_DATABASE_URL não foi definida. Os testes com banco não podem usar DATABASE_URL como fallback."
        : "DATABASE_URL não foi definida. Copie .env.example para .env e configure o PostgreSQL local.",
    );
  }

  return url;
}

export function getPrisma() {
  const transactionClient = transactionContext.getStore();
  if (transactionClient) return transactionClient;

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

export async function runInTransaction(
  operation,
  { client, ...transactionOptions } = {},
) {
  const activeTransaction = transactionContext.getStore();
  if (activeTransaction) return operation(activeTransaction);

  const prisma = client ?? getPrisma();
  const execute = (transactionClient) =>
    transactionContext.run(transactionClient, () => operation(transactionClient));

  if (Object.keys(transactionOptions).length === 0) {
    return prisma.$transaction(execute);
  }

  return prisma.$transaction(execute, transactionOptions);
}

export async function disconnectPrisma() {
  if (!prismaInstance) return;
  await prismaInstance.$disconnect();
  prismaInstance = null;
}
