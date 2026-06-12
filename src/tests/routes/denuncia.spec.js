import request from "supertest";
import { beforeAll, beforeEach, describe, expect, jest, test } from "@jest/globals";
import CustomError from "../../utils/helpers/CustomError.js";
import { createControllerTestApp, createRegularUser, testIds } from "../test.js";

const mockDenunciaService = {
  criar: jest.fn(),
  listar: jest.fn(),
  buscarPorId: jest.fn(),
  atualizar: jest.fn(),
  deletar: jest.fn(),
};

jest.mock("../../containers/services.index.js", () => ({
  denunciaService: mockDenunciaService,
}));

let app;

beforeAll(async () => {
  const { default: denunciaController } = await import("../../controllers/DenunciaController.js");

  app = createControllerTestApp({
    user: createRegularUser({ id: testIds.usuario }),
    registerRoutes: (testApp) => {
      testApp.post("/denuncias", denunciaController.criar);
      testApp.get("/denuncias", denunciaController.listar);
      testApp.get("/denuncias/:id", denunciaController.buscarPorId);
      testApp.put("/denuncias/:id", denunciaController.atualizar);
      testApp.delete("/denuncias/:id", denunciaController.deletar);
    },
  });
});

beforeEach(() => {
  Object.values(mockDenunciaService).forEach((mockFn) => mockFn.mockReset());
});

describe("Testes das Rotas de Denúncia", () => {
  test("Deve criar uma denúncia", async () => {
    const payload = { _id: testIds.denuncia, status: "EM_ANALISE" };
    mockDenunciaService.criar.mockResolvedValue(payload);

    const res = await request(app)
      .post("/denuncias")
      .send({
        tipoAlvo: "ITEM",
        alvoItemId: testIds.item,
        motivo: "FRAUDE",
        descricao: "O item não corresponde ao anunciado.",
      });

    expect(res.statusCode).toBe(201);
    expect(res.body.data).toEqual(payload);
    expect(mockDenunciaService.criar).toHaveBeenCalledWith(
      {
        tipo_alvo: "ITEM",
        alvo_item_id: testIds.item,
        alvo_usuario_id: null,
        motivo: "FRAUDE",
        descricao: "O item não corresponde ao anunciado.",
      },
      expect.objectContaining({ id: testIds.usuario, perfil: "USUARIO" })
    );
  });

  test("Deve listar denúncias do usuário autenticado", async () => {
    const payload = { docs: [{ _id: testIds.denuncia }] };
    mockDenunciaService.listar.mockResolvedValue(payload);

    const res = await request(app)
      .get("/denuncias")
      .query({ status: "EM_ANALISE", page: 1, limit: 10 });

    expect(res.statusCode).toBe(200);
    expect(res.body.data).toEqual(payload);
    expect(mockDenunciaService.listar).toHaveBeenCalledWith(
      {
        filtros: { status: "EM_ANALISE" },
        page: 1,
        limit: 10,
      },
      expect.objectContaining({ id: testIds.usuario })
    );
  });

  test("Deve tratar erro ao atualizar denúncia", async () => {
    mockDenunciaService.atualizar.mockRejectedValue(
      new CustomError({
        statusCode: 400,
        errorType: "operationalError",
        customMessage: "Somente denúncias em análise podem ser atualizadas.",
      })
    );

    const res = await request(app)
      .put(`/denuncias/${testIds.denuncia}`)
      .send({ descricao: "Nova descrição" });

    expect(res.statusCode).toBe(400);
    expect(res.body.message).toBe("Somente denúncias em análise podem ser atualizadas.");
    expect(mockDenunciaService.atualizar).toHaveBeenCalledWith(
      testIds.denuncia,
      { descricao: "Nova descrição" },
      expect.objectContaining({ id: testIds.usuario })
    );
  });
});
