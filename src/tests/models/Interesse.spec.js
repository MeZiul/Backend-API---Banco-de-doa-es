import { describe, expect, test } from "@jest/globals";
import InteresseModel from "../../models/Interesse.js";

describe("Índices do model Interesse", () => {
  test("Deve garantir no máximo um interesse aceito por item", () => {
    const indiceAceito = InteresseModel.schema.indexes().find(([, options]) => {
      return options.name === "interesse_aceito_unico_por_item";
    });

    expect(indiceAceito).toEqual([
      { item_id: 1 },
      expect.objectContaining({
        unique: true,
        partialFilterExpression: { status: "ACEITO" },
      }),
    ]);
  });
});
