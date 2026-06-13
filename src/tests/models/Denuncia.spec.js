import { describe, expect, test } from "@jest/globals";
import DenunciaModel from "../../models/Denuncia.js";

describe("Índices do model Denuncia", () => {
  test.each([
    [
      "denuncia_item_em_analise_unica_por_denunciante",
      { denunciante_id: 1, alvo_item_id: 1 },
      { tipo_alvo: "ITEM", status: "EM_ANALISE" },
    ],
    [
      "denuncia_usuario_em_analise_unica_por_denunciante",
      { denunciante_id: 1, alvo_usuario_id: 1 },
      { tipo_alvo: "USUARIO", status: "EM_ANALISE" },
    ],
  ])("Deve declarar o índice parcial %s", (nome, campos, filtroParcial) => {
    const indice = DenunciaModel.schema.indexes().find(([, options]) => {
      return options.name === nome;
    });

    expect(indice).toEqual([
      campos,
      expect.objectContaining({
        unique: true,
        partialFilterExpression: filtroParcial,
      }),
    ]);
  });
});
