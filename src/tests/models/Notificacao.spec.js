import { describe, expect, test } from "@jest/globals";
import NotificacaoModel from "../../models/Notificacao.js";

describe("Model Notificacao", () => {
  test("Deve usar referência correta de usuário e tipos de domínio necessários", () => {
    const usuarioPath = NotificacaoModel.schema.path("usuario_id");
    const tipoPath = NotificacaoModel.schema.path("tipo");

    expect(usuarioPath.options.ref).toBe("Usuario");
    expect(tipoPath.enumValues).toEqual(
      expect.arrayContaining([
        "INTERESSE_RECEBIDO",
        "INTERESSE_ACEITO",
        "INTERESSE_RECUSADO",
        "INTERESSE_CANCELADO",
        "DENUNCIA_RESULTADO",
        "USUARIO_SUSPENSO",
        "USUARIO_REATIVADO",
        "ITEM_CANCELADO",
      ])
    );
    expect(tipoPath.enumValues).not.toContain("INTERESE_RECEBIDO");
  });
});
