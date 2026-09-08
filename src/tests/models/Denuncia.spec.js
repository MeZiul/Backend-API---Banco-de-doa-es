import fs from "node:fs";
import { describe, expect, test } from "@jest/globals";

const migration = fs.readFileSync(
  new URL("../../../prisma/migrations/20260818213000_init_postgresql/migration.sql", import.meta.url),
  "utf8",
);

describe("Constraints relacionais de Denuncia", () => {
  test.each([
    "denuncia_item_em_analise_unica_por_denunciante",
    "denuncia_usuario_em_analise_unica_por_denunciante",
  ])("declara o índice parcial %s", (nome) => {
    expect(migration).toContain(`CREATE UNIQUE INDEX "${nome}"`);
  });

  test("exige exatamente o alvo correspondente ao tipo", () => {
    expect(migration).toContain('CONSTRAINT "Denuncia_alvo_check" CHECK');
  });
});
