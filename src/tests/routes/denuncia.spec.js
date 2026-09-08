import express from "express";
import request from "supertest";
import { beforeAll, beforeEach, describe, expect, jest, test } from "@jest/globals";
import CustomError from "../../utils/helpers/CustomError.js";
import errorHandler from "../../utils/helpers/errorHandler.js";
import { createRegularUser, createTestBearer, testIds } from "../test.js";

const mockDenunciaService = {
  criar: jest.fn(),
  listar: jest.fn(),
  buscarPorId: jest.fn(),
  atualizar: jest.fn(),
  deletar: jest.fn(),
};

const mockUsuarioRepositoryBuscarPorId = jest.fn();

jest.mock("../../containers/services.index.js", () => ({
  denunciaService: mockDenunciaService,
}));

jest.mock("../../repositories/UsuarioRepository.js", () => ({
  __esModule: true,
  default: class MockUsuarioRepository {
    buscarPorId(...args) {
      return mockUsuarioRepositoryBuscarPorId(...args);
    }
  },
}));

let app;

const bearer = () => createTestBearer(
  createRegularUser({ id: testIds.usuario }),
);

beforeAll(async () => {
  const { default: denunciaRoutes } = await import("../../routes/denunciaRoutes.js");
  app = express();
  app.use(express.json());
  app.use(denunciaRoutes);
  app.use(errorHandler);
});

beforeEach(() => {
  Object.values(mockDenunciaService).forEach((mockFn) => mockFn.mockReset());
  mockUsuarioRepositoryBuscarPorId.mockReset();
  mockUsuarioRepositoryBuscarPorId.mockImplementation(async (id) => ({
    _id: id,
    perfil: "USUARIO",
    situacao: "ATIVO",
  }));
});

describe("Endpoints de Denuncia", () => {
  test("deve exigir autenticacao", async () => {
    const res = await request(app).get("/denuncias");

    expect(res.statusCode).toBe(498);
    expect(mockDenunciaService.listar).not.toHaveBeenCalled();
  });

  test("POST /denuncias deve criar denuncia contra item", async () => {
    const payload = { _id: testIds.denuncia, status: "EM_ANALISE" };
    mockDenunciaService.criar.mockResolvedValue(payload);

    const res = await request(app)
      .post("/denuncias")
      .set("Authorization", bearer())
      .send({
        tipoAlvo: "ITEM",
        alvoItemId: testIds.item,
        motivo: "FRAUDE",
        descricao: "O item nao corresponde ao anunciado.",
      });

    expect(res.statusCode).toBe(201);
    expect(res.body).toMatchObject({ data: payload, errors: [] });
    expect(mockDenunciaService.criar).toHaveBeenCalledWith({
      tipo_alvo: "ITEM",
      alvo_item_id: testIds.item,
      alvo_usuario_id: null,
      motivo: "FRAUDE",
      descricao: "O item nao corresponde ao anunciado.",
    }, expect.objectContaining({ id: testIds.usuario, perfil: "USUARIO" }));
  });

  test("POST /denuncias deve criar denuncia contra usuario", async () => {
    mockDenunciaService.criar.mockResolvedValue({ _id: testIds.denuncia, status: "EM_ANALISE" });

    const res = await request(app)
      .post("/denuncias")
      .set("Authorization", bearer())
      .send({
        tipo_alvo: "USUARIO",
        alvo_usuario_id: testIds.doador,
        motivo: "ASSEDIO",
      });

    expect(res.statusCode).toBe(201);
    expect(mockDenunciaService.criar).toHaveBeenCalledWith({
      tipo_alvo: "USUARIO",
      alvo_item_id: null,
      alvo_usuario_id: testIds.doador,
      motivo: "ASSEDIO",
      descricao: null,
    }, expect.objectContaining({ id: testIds.usuario }));
  });

  test("deve rejeitar denuncia com alvo ausente, motivo invalido ou ObjectId invalido", async () => {
    const semAlvo = await request(app)
      .post("/denuncias")
      .set("Authorization", bearer())
      .send({ tipoAlvo: "ITEM", motivo: "FRAUDE" });
    const motivoInvalido = await request(app)
      .post("/denuncias")
      .set("Authorization", bearer())
      .send({ tipoAlvo: "ITEM", alvoItemId: testIds.item, motivo: "INVALIDO" });
    const idInvalido = await request(app)
      .post("/denuncias")
      .set("Authorization", bearer())
      .send({ tipoAlvo: "USUARIO", alvoUsuarioId: "id-invalido", motivo: "SPAM" });

    expect(semAlvo.statusCode).toBe(400);
    expect(motivoInvalido.statusCode).toBe(400);
    expect(idInvalido.statusCode).toBe(400);
    expect(mockDenunciaService.criar).not.toHaveBeenCalled();
  });

  test("GET /denuncias deve validar e encaminhar filtros", async () => {
    const payload = { docs: [{ _id: testIds.denuncia }] };
    mockDenunciaService.listar.mockResolvedValue(payload);

    const res = await request(app)
      .get("/denuncias")
      .set("Authorization", bearer())
      .query({
        status: "EM_ANALISE",
        tipoAlvo: "ITEM",
        alvoItemId: testIds.item,
        page: 2,
        limite: 5,
      });

    expect(res.statusCode).toBe(200);
    expect(res.body.data).toEqual(payload);
    expect(mockDenunciaService.listar).toHaveBeenCalledWith({
      filtros: {
        status: "EM_ANALISE",
        tipoAlvo: "ITEM",
        alvoItemId: testIds.item,
      },
      page: 2,
      limit: 5,
    }, expect.objectContaining({ id: testIds.usuario }));
  });

  test("deve rejeitar query de denuncia invalida", async () => {
    const res = await request(app)
      .get("/denuncias")
      .set("Authorization", bearer())
      .query({ status: "INVALIDO", page: 0 });

    expect(res.statusCode).toBe(400);
    expect(mockDenunciaService.listar).not.toHaveBeenCalled();
  });

  test("GET /denuncias/:id deve consultar denuncia", async () => {
    const payload = { _id: testIds.denuncia, status: "EM_ANALISE" };
    mockDenunciaService.buscarPorId.mockResolvedValue(payload);

    const res = await request(app)
      .get(`/denuncias/${testIds.denuncia}`)
      .set("Authorization", bearer());

    expect(res.statusCode).toBe(200);
    expect(res.body.data).toEqual(payload);
    expect(mockDenunciaService.buscarPorId).toHaveBeenCalledWith(
      testIds.denuncia,
      expect.objectContaining({ id: testIds.usuario })
    );
  });

  test("deve rejeitar identificador de denuncia invalido", async () => {
    const res = await request(app)
      .get("/denuncias/id-invalido")
      .set("Authorization", bearer());

    expect(res.statusCode).toBe(400);
    expect(mockDenunciaService.buscarPorId).not.toHaveBeenCalled();
  });

  test("PUT /denuncias/:id deve atualizar campos permitidos", async () => {
    const payload = { _id: testIds.denuncia, motivo: "OUTRO", descricao: "Descricao atualizada." };
    mockDenunciaService.atualizar.mockResolvedValue(payload);

    const res = await request(app)
      .put(`/denuncias/${testIds.denuncia}`)
      .set("Authorization", bearer())
      .send({ motivo: "OUTRO", descricao: "Descricao atualizada." });

    expect(res.statusCode).toBe(200);
    expect(res.body.data).toEqual(payload);
    expect(mockDenunciaService.atualizar).toHaveBeenCalledWith(
      testIds.denuncia,
      { motivo: "OUTRO", descricao: "Descricao atualizada." },
      expect.objectContaining({ id: testIds.usuario })
    );
  });

  test("deve rejeitar atualizacao vazia ou identificador invalido", async () => {
    const vazia = await request(app)
      .put(`/denuncias/${testIds.denuncia}`)
      .set("Authorization", bearer())
      .send({});
    const idInvalido = await request(app)
      .put("/denuncias/id-invalido")
      .set("Authorization", bearer())
      .send({ motivo: "OUTRO" });

    expect(vazia.statusCode).toBe(400);
    expect(idInvalido.statusCode).toBe(400);
    expect(mockDenunciaService.atualizar).not.toHaveBeenCalled();
  });

  test("DELETE /denuncias/:id deve remover denuncia", async () => {
    mockDenunciaService.deletar.mockResolvedValue(undefined);

    const res = await request(app)
      .delete(`/denuncias/${testIds.denuncia}`)
      .set("Authorization", bearer());

    expect(res.statusCode).toBe(200);
    expect(res.body.data).toBeNull();
    expect(mockDenunciaService.deletar).toHaveBeenCalledWith(
      testIds.denuncia,
      expect.objectContaining({ id: testIds.usuario })
    );
  });

  test("deve propagar erro operacional do service", async () => {
    mockDenunciaService.atualizar.mockRejectedValue(new CustomError({
      statusCode: 409,
      customMessage: "Denuncia nao esta mais em analise.",
    }));

    const res = await request(app)
      .put(`/denuncias/${testIds.denuncia}`)
      .set("Authorization", bearer())
      .send({ descricao: "Nova descricao." });

    expect(res.statusCode).toBe(409);
    expect(res.body.message).toBe("Denuncia nao esta mais em analise.");
  });

  test("deve propagar erro ao remover denuncia", async () => {
    mockDenunciaService.deletar.mockRejectedValue(new CustomError({
      statusCode: 403,
      customMessage: "Apenas o autor pode remover a denuncia.",
    }));

    const res = await request(app)
      .delete(`/denuncias/${testIds.denuncia}`)
      .set("Authorization", bearer());

    expect(res.statusCode).toBe(403);
    expect(res.body.message).toBe("Apenas o autor pode remover a denuncia.");
  });
});
