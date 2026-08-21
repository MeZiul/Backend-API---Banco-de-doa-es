import { afterEach, describe, expect, jest, test } from "@jest/globals";
import {
  getDatabaseUrl,
  getPrisma,
  runInTransaction,
} from "../../config/prisma.js";

const originalTestDatabaseUrl = process.env.TEST_DATABASE_URL;
const originalDatabaseUrl = process.env.DATABASE_URL;

afterEach(() => {
  if (originalTestDatabaseUrl === undefined) {
    delete process.env.TEST_DATABASE_URL;
  } else {
    process.env.TEST_DATABASE_URL = originalTestDatabaseUrl;
  }

  if (originalDatabaseUrl === undefined) {
    delete process.env.DATABASE_URL;
  } else {
    process.env.DATABASE_URL = originalDatabaseUrl;
  }
});

describe("getDatabaseUrl", () => {
  test("exige TEST_DATABASE_URL durante testes e não usa o banco principal como fallback", () => {
    delete process.env.TEST_DATABASE_URL;
    process.env.DATABASE_URL = "postgresql://doai:senha@localhost:5432/doai";

    expect(() => getDatabaseUrl()).toThrow("TEST_DATABASE_URL");
  });

  test("usa exclusivamente TEST_DATABASE_URL durante testes", () => {
    process.env.TEST_DATABASE_URL =
      "postgresql://doai:senha@localhost:5433/doai_test";
    process.env.DATABASE_URL = "postgresql://doai:senha@localhost:5432/doai";

    expect(getDatabaseUrl()).toBe(process.env.TEST_DATABASE_URL);
  });
});

describe("runInTransaction", () => {
  test("reutiliza a transação ativa em operações compostas", async () => {
    const transactionClient = { usuario: { update: jest.fn() } };
    const client = {
      $transaction: jest.fn(async (callback) => callback(transactionClient)),
    };

    const resultado = await runInTransaction(
      async (outerTransaction) => {
        expect(outerTransaction).toBe(transactionClient);
        expect(getPrisma()).toBe(transactionClient);

        return runInTransaction(
          async (innerTransaction) => {
            expect(innerTransaction).toBe(transactionClient);
            return "commit";
          },
          { client },
        );
      },
      { client },
    );

    expect(resultado).toBe("commit");
    expect(client.$transaction).toHaveBeenCalledTimes(1);
  });
});
