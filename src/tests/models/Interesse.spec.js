import fs from "node:fs";
import { describe, expect, test } from "@jest/globals";

const migration = fs.readFileSync(
  new URL("../../../prisma/migrations/20260818213000_init_postgresql/migration.sql", import.meta.url),
  "utf8",
);

describe("Constraints relacionais de Interesse", () => {
  test("garante no máximo um interesse aceito por item", () => {
    expect(migration).toContain('CREATE UNIQUE INDEX "interesse_aceito_unico_por_item"');
    expect(migration).toContain('WHERE "status" = \'ACEITO\'');
  });

  test("impede dois interesses ativos do mesmo usuário no mesmo item", () => {
    expect(migration).toContain('CREATE UNIQUE INDEX "interesse_ativo_unico_por_usuario_item"');
    expect(migration).toContain('WHERE "status" IN (\'PENDENTE\', \'ACEITO\')');
  });
});
