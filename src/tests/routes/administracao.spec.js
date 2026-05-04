import request from "supertest";
import { beforeAll, beforeEach, describe, expect, jest, test } from "@jest/globals";
import CustomError from "../../utils/helpers/CustomError.js";
import { createAdminUser, createControllerTestApp, testIds } from "../test.js";

const mockAdministracaoService = {
  listar: jest.fn(),
  buscarPorId: jest.fn(),
  listarPorAlvo: jest.fn(),
  listarPorAdministrador: jest.fn(),
  listarUsuarios: jest.fn(),
  buscarUsuarioPorId: jest.fn(),
  listarItens: jest.fn(),
  listarDenuncias: jest.fn(),
  bloquearUsuario: jest.fn(),
  desbloquearUsuario: jest.fn(),
  inativarUsuario: jest.fn(),
  cancelarItem: jest.fn(),
  resolverDenuncia: jest.fn(),
};

jest.mock("../../containers/services.administracao.container.js", () => ({
  administracaoService: mockAdministracaoService,
}));

let app;

beforeAll(async () => {
  const { default: administracaoController } = await import("../../controllers/AdministracaoController.js");

  app = createControllerTestApp({
    user: createAdminUser(),
    registerRoutes: (testApp) => {
      testApp.get("/admin/administracoes", administracaoController.listar);
      testApp.get("/admin/administracoes/:id", administracaoController.buscarPorId);
      testApp.get("/admin/alvos/:alvoId/administracoes", administracaoController.listarPorAlvo);
      testApp.get("/admin/administradores/:administradorId/administracoes", administracaoController.listarPorAdministrador);
      testApp.get("/admin/usuarios", administracaoController.listarUsuarios);
      testApp.get("/admin/usuarios/:id", administracaoController.buscarUsuarioPorId);
      testApp.put("/admin/usuarios/:id/bloquear", administracaoController.bloquearUsuario);
      testApp.put("/admin/usuarios/:id/desbloquear", administracaoController.desbloquearUsuario);
      testApp.delete("/admin/usuarios/:id", administracaoController.inativarUsuario);
      testApp.get("/admin/itens", administracaoController.listarItens);
      testApp.delete("/admin/itens/:id", administracaoController.cancelarItem);
      testApp.get("/admin/denuncias", administracaoController.listarDenuncias);
      testApp.put("/admin/denuncias/:id/resolver", administracaoController.resolverDenuncia);
    },
  });
});

beforeEach(() => {
  Object.values(mockAdministracaoService).forEach((mockFn) => mockFn.mockReset());
});

describe("Testes das Rotas de Administração", () => {
  test("Deve listar ações administrativas", async () => {
    const payload = { docs: [{ _id: testIds.administracao }] };
    mockAdministracaoService.listar.mockResolvedValue(payload);

    const res = await request(app)
      .get("/admin/administracoes")
      .query({ page: 2, limit: 5, tipoAlvo: "USUARIO" });

    expect(res.statusCode).toBe(200);
    expect(res.body.data).toEqual(payload);
    expect(mockAdministracaoService.listar).toHaveBeenCalledWith(
      {
        filtros: { tipoAlvo: "USUARIO" },
        page: 2,
        limit: 5,
      },
      expect.objectContaining({ perfil: "ADMINISTRADOR" })
    );
  });

  test("Deve listar denúncias para moderação administrativa", async () => {
    const payload = { docs: [{ _id: testIds.denuncia }] };
    mockAdministracaoService.listarDenuncias.mockResolvedValue(payload);

    const res = await request(app)
      .get("/admin/denuncias")
      .query({ status: "EM_ANALISE", page: 1, limit: 10 });

    expect(res.statusCode).toBe(200);
    expect(res.body.data).toEqual(payload);
    expect(mockAdministracaoService.listarDenuncias).toHaveBeenCalledWith(
      {
        filtros: { status: "EM_ANALISE" },
        page: 1,
        limit: 10,
      },
      expect.objectContaining({ perfil: "ADMINISTRADOR" })
    );
  });

  test("Deve bloquear um usuário e retornar sucesso", async () => {
    const payload = { _id: testIds.usuario, situacao: "SUSPENSO" };
    mockAdministracaoService.bloquearUsuario.mockResolvedValue(payload);

    const res = await request(app)
      .put(`/admin/usuarios/${testIds.usuario}/bloquear`)
      .send({ justificativa: "Violação das regras", suspensaoAte: "2026-12-31T00:00:00.000Z" });

    expect(res.statusCode).toBe(200);
    expect(res.body.data).toEqual(payload);
    expect(mockAdministracaoService.bloquearUsuario).toHaveBeenCalledWith(
      testIds.usuario,
      expect.objectContaining({
        justificativa: "Violação das regras",
        suspensao_ate: "2026-12-31T00:00:00.000Z",
      }),
      expect.objectContaining({ perfil: "ADMINISTRADOR" })
    );
  });

  test("Deve retornar erro operacional quando a resolução administrativa falhar", async () => {
    mockAdministracaoService.resolverDenuncia.mockRejectedValue(
      new CustomError({
        statusCode: 400,
        errorType: "operationalError",
        customMessage: "Apenas denúncias em análise podem ser resolvidas.",
      })
    );

    const res = await request(app)
      .put(`/admin/denuncias/${testIds.denuncia}/resolver`)
      .send({ resultado: "PROCEDENTE" });

    expect(res.statusCode).toBe(400);
    expect(res.body.message).toBe("Apenas denúncias em análise podem ser resolvidas.");
    expect(mockAdministracaoService.resolverDenuncia).toHaveBeenCalledWith(
      testIds.denuncia,
      expect.objectContaining({ resultado_denuncia: "PROCEDENTE" }),
      expect.objectContaining({ perfil: "ADMINISTRADOR" })
    );
  });
});
