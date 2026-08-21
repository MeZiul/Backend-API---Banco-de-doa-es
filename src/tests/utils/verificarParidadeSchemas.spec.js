import { describe, expect, test } from "@jest/globals";
import {
  obterCamposPublicosDoPrisma,
  verificarTodasParidades,
} from "../../utils/verificarParidadeSchemas.js";

describe("paridade entre Prisma e schemas Zod de resposta", () => {
  test("cobre todos os modelos públicos sem campos ausentes ou excedentes", () => {
    expect(() => verificarTodasParidades()).not.toThrow();
  });

  test("deriva ItemDoacao e Notificacao do Prisma Client gerado", () => {
    expect(obterCamposPublicosDoPrisma("ItemDoacao")).toEqual(
      expect.arrayContaining(["_id", "usuario_id", "categoria_id", "status", "fotos"]),
    );
    expect(obterCamposPublicosDoPrisma("Notificacao")).toEqual(
      expect.arrayContaining(["_id", "usuario_id", "tipo", "lida"]),
    );
  });
});
