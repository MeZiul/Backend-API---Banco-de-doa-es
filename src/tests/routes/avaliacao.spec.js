import request from "supertest";
import { beforeAll, beforeEach, describe, expect, jest, test } from "@jest/globals";
import CustomError from "../../utils/helpers/CustomError.js";
import { createControllerTestApp, createRegularUser, testIds } from "../test.js";

const mockAvaliacaoService = {
  criar: jest.fn(),
  listarPorUsuario: jest.fn(),
  buscarPorId: jest.fn(),
  atualizar: jest.fn(),
  deletar: jest.fn(),
};

jest.mock("../../containers/services.index.js", () => ({
  avaliacaoService: mockAvaliacaoService,
}));

let app;

beforeAll(async () => {
  const { default: AvaliacaoController } = await import("../../controllers/AvaliacaoController.js");
  const controller = new AvaliacaoController();

  app = createControllerTestApp({
    user: createRegularUser({ id: testIds.interessado }),
    registerRoutes: (testApp) => {
      testApp.post("/avaliacoes", controller.criar);
      testApp.get("/avaliacoes", controller.listar);
      testApp.get("/avaliacoes/:id", controller.buscarPorId);
      testApp.put("/avaliacoes/:id", controller.atualizar);
      testApp.delete("/avaliacoes/:id", controller.deletar);
    },
  });
});

beforeEach(() => {
  Object.values(mockAvaliacaoService).forEach((mockFn) => mockFn.mockReset());
});

describe("Testes das Rotas de Avaliação", () => {
  test("Deve criar uma avaliação", async () => {
    const payload = { _id: testIds.denuncia, nota: 5 };
    mockAvaliacaoService.criar.mockResolvedValue(payload);

    const res = await request(app)
      .post("/avaliacoes")
      .send({
        item_id: testIds.item,
        avaliado_id: testIds.doador,
        nota: 5,
        comentario: "Doação concluída corretamente.",
        tipo: "INTERESSADO_PARA_DOADOR",
      });

    expect(res.statusCode).toBe(201);
    expect(res.body.data).toEqual(payload);
    expect(mockAvaliacaoService.criar).toHaveBeenCalledWith(
      {
        item_id: testIds.item,
        avaliado_id: testIds.doador,
        nota: 5,
        comentario: "Doação concluída corretamente.",
        tipo: "INTERESSADO_PARA_DOADOR",
      },
      testIds.interessado
    );
  });

  test("Deve listar avaliações com filtros", async () => {
    const payload = { docs: [{ _id: testIds.denuncia }] };
    mockAvaliacaoService.listarPorUsuario.mockResolvedValue(payload);

    const res = await request(app)
      .get("/avaliacoes")
      .query({ avaliado_id: testIds.doador, page: 2, limite: 5 });

    expect(res.statusCode).toBe(200);
    expect(res.body.data).toEqual(payload);
    expect(mockAvaliacaoService.listarPorUsuario).toHaveBeenCalledWith(
      {
        filtros: { avaliado_id: testIds.doador },
        page: 2,
        limit: 5,
      },
      expect.objectContaining({ id: testIds.interessado })
    );
  });

  test("Deve atualizar somente campos permitidos da avaliação", async () => {
    const payload = { _id: testIds.denuncia, nota: 4 };
    mockAvaliacaoService.atualizar.mockResolvedValue(payload);

    const res = await request(app)
      .put(`/avaliacoes/${testIds.denuncia}`)
      .send({ nota: 4, comentario: "Comentário revisado." });

    expect(res.statusCode).toBe(200);
    expect(res.body.data).toEqual(payload);
    expect(mockAvaliacaoService.atualizar).toHaveBeenCalledWith(
      testIds.denuncia,
      { nota: 4, comentario: "Comentário revisado." },
      expect.objectContaining({ id: testIds.interessado })
    );
  });

  test("Deve rejeitar alteração de campos sensíveis da avaliação", async () => {
    const res = await request(app)
      .put(`/avaliacoes/${testIds.denuncia}`)
      .send({ item_id: testIds.item });

    expect(res.statusCode).toBe(400);
    expect(mockAvaliacaoService.atualizar).not.toHaveBeenCalled();
  });

  test("Deve propagar erro ao remover avaliação de outro usuário", async () => {
    mockAvaliacaoService.deletar.mockRejectedValue(
      new CustomError({
        statusCode: 403,
        errorType: "operationalError",
        customMessage: "Apenas o autor da avaliação pode alterar ou remover este registro.",
      })
    );

    const res = await request(app).delete(`/avaliacoes/${testIds.denuncia}`);

    expect(res.statusCode).toBe(403);
    expect(res.body.message).toBe("Apenas o autor da avaliação pode alterar ou remover este registro.");
    expect(mockAvaliacaoService.deletar).toHaveBeenCalledWith(
      testIds.denuncia,
      expect.objectContaining({ id: testIds.interessado })
    );
  });
});
