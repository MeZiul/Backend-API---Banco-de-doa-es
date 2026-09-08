import express from "express";
import request from "supertest";
import { beforeAll, beforeEach, describe, expect, jest, test } from "@jest/globals";
import CustomError from "../../utils/helpers/CustomError.js";
import errorHandler from "../../utils/helpers/errorHandler.js";
import { createRegularUser, createTestBearer, testIds } from "../test.js";

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

const bearer = (user) => createTestBearer(user);
const usuarioAuth = () => bearer(createRegularUser({ id: testIds.interessado }));

const avaliacaoId = testIds.denuncia; 

beforeAll(async () => {
  const { default: avaliacaoRoutes } = await import("../../routes/avaliacaoRoutes.js");
  app = express();
  app.use(express.json());
  app.use(avaliacaoRoutes);
  app.use(errorHandler);
});

beforeEach(() => {
  Object.values(mockAvaliacaoService).forEach((mockFn) => mockFn.mockReset());
});

describe("Rotas de Avaliacao", () => {
  test("deve exigir autenticacao (498 sem token)", async () => {
    const res = await request(app).get("/avaliacoes");

    expect(res.statusCode).toBe(498);
    expect(mockAvaliacaoService.listarPorUsuario).not.toHaveBeenCalled();
  });

  test("deve criar uma avaliacao", async () => {
    const payload = { _id: avaliacaoId, nota: 5 };
    mockAvaliacaoService.criar.mockResolvedValue(payload);

    const res = await request(app)
      .post("/avaliacoes")
      .set("Authorization", usuarioAuth())
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
      testIds.interessado,
    );
  });

  test("deve listar avaliacoes com filtros", async () => {
    const payload = { docs: [{ _id: avaliacaoId }] };
    mockAvaliacaoService.listarPorUsuario.mockResolvedValue(payload);

    const res = await request(app)
      .get("/avaliacoes")
      .set("Authorization", usuarioAuth())
      .query({ avaliado_id: testIds.doador, page: 2, limite: 5 });

    expect(res.statusCode).toBe(200);
    expect(res.body.data).toEqual(payload);
    expect(mockAvaliacaoService.listarPorUsuario).toHaveBeenCalledWith(
      {
        filtros: { avaliado_id: testIds.doador },
        page: 2,
        limit: 5,
      },
      expect.objectContaining({ id: testIds.interessado }),
    );
  });

  test("deve buscar avaliacao por id", async () => {
    const payload = { _id: avaliacaoId, nota: 5 };
    mockAvaliacaoService.buscarPorId.mockResolvedValue(payload);

    const res = await request(app)
      .get(`/avaliacoes/${avaliacaoId}`)
      .set("Authorization", usuarioAuth());

    expect(res.statusCode).toBe(200);
    expect(res.body.data).toEqual(payload);
  });

  test("deve retornar 404 se avaliacao nao existe", async () => {
    mockAvaliacaoService.buscarPorId.mockRejectedValue(
      new CustomError({ statusCode: 404, customMessage: "Avaliação não encontrada." }),
    );

    const res = await request(app)
      .get(`/avaliacoes/${avaliacaoId}`)
      .set("Authorization", usuarioAuth());

    expect(res.statusCode).toBe(404);
  });

  test("deve atualizar somente campos permitidos da avaliacao", async () => {
    const payload = { _id: avaliacaoId, nota: 4 };
    mockAvaliacaoService.atualizar.mockResolvedValue(payload);

    const res = await request(app)
      .put(`/avaliacoes/${avaliacaoId}`)
      .set("Authorization", usuarioAuth())
      .send({ nota: 4, comentario: "Comentário revisado." });

    expect(res.statusCode).toBe(200);
    expect(res.body.data).toEqual(payload);
    expect(mockAvaliacaoService.atualizar).toHaveBeenCalledWith(
      avaliacaoId,
      { nota: 4, comentario: "Comentário revisado." },
      expect.objectContaining({ id: testIds.interessado }),
    );
  });

  test("deve rejeitar alteracao de campos sensiveis da avaliacao", async () => {
    const res = await request(app)
      .put(`/avaliacoes/${avaliacaoId}`)
      .set("Authorization", usuarioAuth())
      .send({ item_id: testIds.item });

    expect(res.statusCode).toBe(400);
    expect(mockAvaliacaoService.atualizar).not.toHaveBeenCalled();
  });

  test("deve propagar erro ao remover avaliacao de outro usuario", async () => {
    mockAvaliacaoService.deletar.mockRejectedValue(
      new CustomError({
        statusCode: 403,
        errorType: "operationalError",
        customMessage: "Apenas o autor da avaliação pode alterar ou remover este registro.",
      }),
    );

    const res = await request(app)
      .delete(`/avaliacoes/${avaliacaoId}`)
      .set("Authorization", usuarioAuth());

    expect(res.statusCode).toBe(403);
    expect(res.body.message).toBe(
      "Apenas o autor da avaliação pode alterar ou remover este registro.",
    );
    expect(mockAvaliacaoService.deletar).toHaveBeenCalledWith(
      avaliacaoId,
      expect.objectContaining({ id: testIds.interessado }),
    );
  });

  test("deve deletar avaliacao com sucesso", async () => {
    mockAvaliacaoService.deletar.mockResolvedValue({ _id: avaliacaoId });

    const res = await request(app)
      .delete(`/avaliacoes/${avaliacaoId}`)
      .set("Authorization", usuarioAuth());

    expect(res.statusCode).toBe(204);
    expect(mockAvaliacaoService.deletar).toHaveBeenCalledTimes(1);
  });
});
