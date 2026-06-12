import request from "supertest";
import { beforeAll, beforeEach, describe, expect, jest, test } from "@jest/globals";
import CustomError from "../../utils/helpers/CustomError.js";
import { createControllerTestApp, createRegularUser, testIds } from "../test.js";

const mockInteresseService = {
  criar: jest.fn(),
  listar: jest.fn(),
  buscarPorId: jest.fn(),
  aceitar: jest.fn(),
  recusar: jest.fn(),
  cancelar: jest.fn(),
};

jest.mock("../../containers/services.index.js", () => ({
  interesseService: mockInteresseService,
}));

let app;

beforeAll(async () => {
  const { default: interesseController } = await import("../../controllers/InteresseController.js");

  app = createControllerTestApp({
    user: createRegularUser({ id: testIds.interessado }),
    registerRoutes: (testApp) => {
      testApp.post("/interesses", interesseController.criar);
      testApp.get("/interesses", interesseController.listar);
      testApp.get("/interesses/:id", interesseController.buscarPorId);
      testApp.put("/interesses/:id/aceitar", interesseController.aceitar);
      testApp.put("/interesses/:id/recusar", interesseController.recusar);
      testApp.delete("/interesses/:id", interesseController.cancelar);
    },
  });
});

beforeEach(() => {
  Object.values(mockInteresseService).forEach((mockFn) => mockFn.mockReset());
});

describe("Testes das Rotas de Interesse", () => {
  test("Deve criar um interesse", async () => {
    const payload = { _id: testIds.administracao, status: "PENDENTE" };
    mockInteresseService.criar.mockResolvedValue(payload);

    const res = await request(app)
      .post("/interesses")
      .send({
        itemId: testIds.item,
        mensagem: "Tenho interesse no item.",
      });

    expect(res.statusCode).toBe(201);
    expect(res.body.data).toEqual(payload);
    expect(mockInteresseService.criar).toHaveBeenCalledWith(
      {
        item_id: testIds.item,
        mensagem_interessado: "Tenho interesse no item.",
      },
      expect.objectContaining({ id: testIds.interessado, perfil: "USUARIO" })
    );
  });

  test("Deve listar interesses do usuário autenticado", async () => {
    const payload = { docs: [{ _id: testIds.administracao }] };
    mockInteresseService.listar.mockResolvedValue(payload);

    const res = await request(app)
      .get("/interesses")
      .query({ status: "PENDENTE", page: 1, limit: 10 });

    expect(res.statusCode).toBe(200);
    expect(res.body.data).toEqual(payload);
    expect(mockInteresseService.listar).toHaveBeenCalledWith(
      {
        filtros: { status: "PENDENTE" },
        page: 1,
        limit: 10,
      },
      expect.objectContaining({ id: testIds.interessado })
    );
  });

  test("Deve propagar erro do service ao aceitar interesse", async () => {
    mockInteresseService.aceitar.mockRejectedValue(
      new CustomError({
        statusCode: 403,
        errorType: "operationalError",
        customMessage: "Apenas o doador responsável pode realizar esta operação.",
      })
    );

    const res = await request(app)
      .put(`/interesses/${testIds.administracao}/aceitar`)
      .send({ mensagemResposta: "Item reservado para você." });

    expect(res.statusCode).toBe(403);
    expect(res.body.message).toBe("Apenas o doador responsável pode realizar esta operação.");
    expect(mockInteresseService.aceitar).toHaveBeenCalledWith(
      testIds.administracao,
      { resposta_doador: "Item reservado para você." },
      expect.objectContaining({ id: testIds.interessado })
    );
  });
});
