import "dotenv/config";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import pg from "pg";
import { getDatabaseUrl } from "../src/config/prisma.js";

const { Client } = pg;
const schemaName = `auth_migration_${randomUUID().replaceAll("-", "")}`;
const initialMigrationUrl = new URL(
  "../prisma/migrations/20260818213000_init_postgresql/migration.sql",
  import.meta.url,
);
const authMigrationUrl = new URL(
  "../prisma/migrations/20260825182000_migrate_auth_to_better_auth/migration.sql",
  import.meta.url,
);

const client = new Client({ connectionString: getDatabaseUrl() });

async function run() {
  const [initialSql, authSql] = await Promise.all([
    readFile(initialMigrationUrl, "utf8"),
    readFile(authMigrationUrl, "utf8"),
  ]);

  await client.connect();
  await client.query("BEGIN");

  try {
    await client.query(`CREATE SCHEMA "${schemaName}"`);
    await client.query(`SET LOCAL search_path TO "${schemaName}"`);
    await client.query(initialSql);
    await client.query(
      `INSERT INTO "Usuario" (
        "id", "nome", "email", "cpf", "cidade", "uf", "senha", "data_atualizacao"
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP)`,
      [
        "usuario-legado",
        "Usuario Legado",
        "legado@doai.local",
        "123.456.789-09",
        "Vilhena",
        "RO",
        "$2b$12$hash-legado",
      ],
    );

    await client.query(authSql);

    const account = await client.query(
      `SELECT "issuer", "accountId", "providerId", "userId", "password"
       FROM "Account" WHERE "userId" = $1`,
      ["usuario-legado"],
    );
    assert.deepEqual(account.rows, [
      {
        issuer: "local:credential",
        accountId: "usuario-legado",
        providerId: "credential",
        userId: "usuario-legado",
        password: "$2b$12$hash-legado",
      },
    ]);

    const removedColumns = await client.query(
      `SELECT column_name
       FROM information_schema.columns
       WHERE table_schema = $1
         AND table_name = 'Usuario'
         AND column_name IN ('senha', 'token_redefinicao', 'token_redefinicao_expira')`,
      [schemaName],
    );
    assert.equal(removedColumns.rowCount, 0);

    const migratedUser = await client.query(
      `SELECT "email_verificado" FROM "Usuario" WHERE "id" = $1`,
      ["usuario-legado"],
    );
    assert.equal(migratedUser.rows[0].email_verificado, false);

    console.log(
      "OK: hash legado migrado para Account e colunas antigas removidas atomicamente.",
    );
  } finally {
    await client.query("ROLLBACK");
    await client.end();
  }
}

run().catch((error) => {
  console.error("Falha no smoke test da migração Better Auth:", error);
  process.exitCode = 1;
});
