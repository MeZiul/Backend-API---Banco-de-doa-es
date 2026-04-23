import request from "supertest";
import { beforeAll, beforeEach, describe, expect, jest, test } from "@jest/globals";
import CustomError from "../../utils/helpers/CustomError.js";
import { createAdminUser, createControllerTestApp, testIds } from "../test.js";

const administracaoServiceMock = {
  listar: jest.fn(),
  buscarPorId: jest.fn(),
  listarPorAlvo: jest.fn(),
  listarPorAdministrador: jest.fn(),
  bloquearUsuario: jest.fn(),
  desbloquearUsuario: jest.fn(),
  inativarUsuario: jest.fn(),
  cancelarItem: jest.fn(),
  resolverDenuncia: jest.fn(),
};

let app;

beforeAll(async () => {
  jest.unstable_mockModule("../../containers/services.administracao.container.js", () => ({
    administracaoService: administracaoServiceMock,
  }));

  const { default: administracaoController } = await import("../../controllers/AdministracaoController.js");

  app = createControllerTestApp({
    user: createAdminUser(),
    registerRoutes: (testApp) => {
      testApp.get("/admin/administracoes", administracaoController.listar);
      testApp.get("/admin/administracoes/:id", administracaoController.buscarPorId);
      testApp.get("/admin/alvos/:alvoId/administracoes", administracaoController.listarPorAlvo);
      testApp.get("/admin/administradores/:administradorId/administracoes", administracaoController.listarPorAdministrador);
      testApp.put("/admin/usuarios/:id/bloquear", administracaoController.bloquearUsuario);
      testApp.put("/admin/usuarios/:id/desbloquear", administracaoController.desbloquearUsuario);
      testApp.put("/admin/usuarios/:id/inativar", administracaoController.inativarUsuario);
      testApp.put("/admin/itens/:id/cancelar", administracaoController.cancelarItem);
      testApp.put("/admin/denuncias/:id/resolver", administracaoController.resolverDenuncia);
    },
  });
});

beforeEach(() => {
  Object.values(administracaoServiceMock).forEach((mockFn) => mockFn.mockReset());
});

describe("Testes das Rotas de Administração", () => {
  test("Deve listar ações administrativas", async () => {
    const payload = { docs: [{ _id: testIds.administracao }] };
    administracaoServiceMock.listar.mockResolvedValue(payload);

    const res = await request(app)
      .get("/admin/administracoes")
      .query({ page: 2, limit: 5, tipoAlvo: "USUARIO" });

    expect(res.statusCode).toBe(200);
    expect(res.body.data).toEqual(payload);
    expect(administracaoServiceMock.listar).toHaveBeenCalledWith(
      {
        filtros: { page: "2", limit: "5", tipoAlvo: "USUARIO" },
        page: "2",
        limit: "5",
      },
      expect.objectContaining({ perfil: "ADMINISTRADOR" })
    );
  });

  test("Deve bloquear um usuário e retornar sucesso", async () => {
    const payload = { _id: testIds.usuario, situacao: "SUSPENSO" };
    administracaoServiceMock.bloquearUsuario.mockResolvedValue(payload);

    const res = await request(app)
      .put(`/admin/usuarios/${testIds.usuario}/bloquear`)
      .send({ justificativa: "Violação das regras", suspensao_ate: "2026-12-31T00:00:00.000Z" });

    expect(res.statusCode).toBe(200);
    expect(res.body.data).toEqual(payload);
    expect(administracaoServiceMock.bloquearUsuario).toHaveBeenCalledWith(
      testIds.usuario,
      { justificativa: "Violação das regras", suspensao_ate: "2026-12-31T00:00:00.000Z" },
      expect.objectContaining({ perfil: "ADMINISTRADOR" })
    );
  });

  test("Deve retornar erro operacional quando a ação administrativa falhar", async () => {
    administracaoServiceMock.resolverDenuncia.mockRejectedValue(
      new CustomError({
        statusCode: 400,
        errorType: "operationalError",
        customMessage: "O resultado da denúncia deve ser PROCEDENTE ou IMPROCEDENTE.",
      })
    );

    const res = await request(app)
      .put(`/admin/denuncias/${testIds.denuncia}/resolver`)
      .send({ resultado: "INVALIDO" });

    expect(res.statusCode).toBe(400);
    expect(res.body.message).toBe("O resultado da denúncia deve ser PROCEDENTE ou IMPROCEDENTE.");
    expect(administracaoServiceMock.resolverDenuncia).toHaveBeenCalledWith(
      testIds.denuncia,
      { resultado: "INVALIDO" },
      expect.objectContaining({ perfil: "ADMINISTRADOR" })
    );
  });
});
