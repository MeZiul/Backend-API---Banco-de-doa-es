import fs from "node:fs";
import { describe, expect, test } from "@jest/globals";

const schema = fs.readFileSync(
  new URL("../../../prisma/schema.prisma", import.meta.url),
  "utf8",
);

describe("Schema Prisma de Notificacao", () => {
  test("mantém a relação com Usuario e os tipos de domínio esperados", () => {
    expect(schema).toContain("model Notificacao {");
    expect(schema).toContain("usuario          Usuario");
    expect(schema).toContain("INTERESSE_RECEBIDO");
    expect(schema).toContain("INTERESSE_ACEITO");
    expect(schema).toContain("INTERESSE_RECUSADO");
    expect(schema).toContain("DENUNCIA_RESULTADO");
    expect(schema).not.toContain("INTERESE_RECEBIDO");
  });
});
