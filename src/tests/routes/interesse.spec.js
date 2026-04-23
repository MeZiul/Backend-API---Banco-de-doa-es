import request from "supertest";
import { beforeAll, beforeEach, describe, expect, jest, test } from "@jest/globals";
import CustomError from "../../utils/helpers/CustomError.js";
import { createControllerTestApp, createRegularUser, testIds } from "../test.js";

const interesseServiceMock = {
  criar: jest.fn(),
  listar: jest.fn(),
  buscarPorId: jest.fn(),
  aceitar: jest.fn(),
  recusar: jest.fn(),
  cancelar: jest.fn(),
};

let app;

beforeAll(async () => {
  jest.unstable_mockModule("../../containers/services.interesse.container.js", () => ({
    interesseService: interesseServiceMock,
  }));

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
  Object.values(interesseServiceMock).forEach((mockFn) => mockFn.mockReset());
});

describe("Testes das Rotas de Interesse", () => {
  test("Deve criar um interesse", async () => {
    const payload = { _id: testIds.administracao, status: "PENDENTE" };
    interesseServiceMock.criar.mockResolvedValue(payload);

    const body = {
      item_id: testIds.item,
      mensagem_interessado: "Tenho interesse no item.",
    };

    const res = await request(app)
      .post("/interesses")
      .send(body);

    expect(res.statusCode).toBe(201);
    expect(res.body.data).toEqual(payload);
    expect(interesseServiceMock.criar).toHaveBeenCalledWith(
      body,
      expect.objectContaining({ id: testIds.interessado, perfil: "USUARIO" })
    );
  });

  test("Deve listar interesses do usuário autenticado", async () => {
    const payload = { docs: [{ _id: testIds.administracao }] };
    interesseServiceMock.listar.mockResolvedValue(payload);

    const res = await request(app)
      .get("/interesses")
      .query({ status: "PENDENTE", page: 1, limit: 10 });

    expect(res.statusCode).toBe(200);
    expect(res.body.data).toEqual(payload);
    expect(interesseServiceMock.listar).toHaveBeenCalledWith(
      {
        filtros: { status: "PENDENTE", page: "1", limit: "10" },
        page: "1",
        limit: "10",
      },
      expect.objectContaining({ id: testIds.interessado })
    );
  });

  test("Deve propagar erro do service ao aceitar interesse", async () => {
    interesseServiceMock.aceitar.mockRejectedValue(
      new CustomError({
        statusCode: 403,
        errorType: "operationalError",
        customMessage: "Apenas o doador responsável pode realizar esta operação.",
      })
    );

    const res = await request(app)
      .put(`/interesses/${testIds.administracao}/aceitar`)
      .send({ resposta_doador: "Item reservado para você." });

    expect(res.statusCode).toBe(403);
    expect(res.body.message).toBe("Apenas o doador responsável pode realizar esta operação.");
    expect(interesseServiceMock.aceitar).toHaveBeenCalledWith(
      testIds.administracao,
      { resposta_doador: "Item reservado para você." },
      expect.objectContaining({ id: testIds.interessado })
    );
  });
});
