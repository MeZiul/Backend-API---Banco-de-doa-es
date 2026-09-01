import express from "express";
import request from "supertest";
import { beforeAll, beforeEach, describe, expect, jest, test } from "@jest/globals";
import CustomError from "../../utils/helpers/CustomError.js";
import errorHandler from "../../utils/helpers/errorHandler.js";
import { createRegularUser, createTestBearer, testIds } from "../test.js";

const mockInteresseService = {
  criar: jest.fn(),
  listar: jest.fn(),
  listarRecebidos: jest.fn(),
  buscarPorId: jest.fn(),
  aceitar: jest.fn(),
  recusar: jest.fn(),
  cancelar: jest.fn(),
};

const mockUsuarioRepositoryBuscarPorId = jest.fn();

jest.mock("../../containers/services.index.js", () => ({
  interesseService: mockInteresseService,
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

const bearer = (user = createRegularUser({ id: testIds.interessado })) =>
  createTestBearer(user);

beforeAll(async () => {
  const { default: interesseRoutes } = await import("../../routes/interesseRoutes.js");
  app = express();
  app.use(express.json());
  app.use(interesseRoutes);
  app.use(errorHandler);
});

beforeEach(() => {
  Object.values(mockInteresseService).forEach((mockFn) => mockFn.mockReset());
  mockUsuarioRepositoryBuscarPorId.mockReset();
  mockUsuarioRepositoryBuscarPorId.mockImplementation(async (id) => ({
    _id: id,
    perfil: "USUARIO",
    situacao: "ATIVO",
  }));
});

describe("Endpoints de Interesse", () => {
  test("deve exigir autenticacao", async () => {
    const res = await request(app).get("/interesses");

    expect(res.statusCode).toBe(498);
    expect(mockInteresseService.listar).not.toHaveBeenCalled();
  });

  test("POST /interesses deve criar interesse e normalizar aliases", async () => {
    const payload = { _id: testIds.administracao, status: "PENDENTE" };
    mockInteresseService.criar.mockResolvedValue(payload);

    const res = await request(app)
      .post("/interesses")
      .set("Authorization", bearer())
      .send({ itemId: testIds.item, mensagem: "Tenho interesse no item." });

    expect(res.statusCode).toBe(201);
    expect(res.body).toMatchObject({ data: payload, errors: [] });
    expect(mockInteresseService.criar).toHaveBeenCalledWith({
      item_id: testIds.item,
      mensagem_interessado: "Tenho interesse no item.",
    }, expect.objectContaining({ id: testIds.interessado, perfil: "USUARIO" }));
  });

  test("POST /interesses deve rejeitar item ausente ou invalido", async () => {
    const ausente = await request(app)
      .post("/interesses")
      .set("Authorization", bearer())
      .send({ mensagem: "Sem item." });
    const invalido = await request(app)
      .post("/interesses")
      .set("Authorization", bearer())
      .send({ itemId: "id-invalido" });

    expect(ausente.statusCode).toBe(400);
    expect(invalido.statusCode).toBe(400);
    expect(mockInteresseService.criar).not.toHaveBeenCalled();
  });

  test("GET /interesses deve validar e encaminhar filtros", async () => {
    const payload = { docs: [{ _id: testIds.administracao }] };
    mockInteresseService.listar.mockResolvedValue(payload);

    const res = await request(app)
      .get("/interesses")
      .set("Authorization", bearer())
      .query({ status: "PENDENTE", itemId: testIds.item, page: 2, limite: 5 });

    expect(res.statusCode).toBe(200);
    expect(res.body.data).toEqual(payload);
    expect(mockInteresseService.listar).toHaveBeenCalledWith({
      filtros: { status: "PENDENTE", itemId: testIds.item },
      page: 2,
      limit: 5,
    }, expect.objectContaining({ id: testIds.interessado }));
  });

  test("GET /interesses/recebidos deve encaminhar filtros ao service", async () => {
    const payload = { docs: [{ _id: testIds.administracao }] };
    mockInteresseService.listarRecebidos.mockResolvedValue(payload);

    const res = await request(app)
      .get("/interesses/recebidos")
      .set("Authorization", bearer(createRegularUser({ id: testIds.doador })))
      .query({ status: "ACEITO", page: 3, limit: 4 });

    expect(res.statusCode).toBe(200);
    expect(mockInteresseService.listarRecebidos).toHaveBeenCalledWith({
      filtros: { status: "ACEITO" },
      page: 3,
      limit: 4,
    }, expect.objectContaining({ id: testIds.doador }));
  });

  test("deve rejeitar query de interesse invalida", async () => {
    const res = await request(app)
      .get("/interesses")
      .set("Authorization", bearer())
      .query({ status: "INVALIDO", limit: 101 });

    expect(res.statusCode).toBe(400);
    expect(mockInteresseService.listar).not.toHaveBeenCalled();
  });

  test("GET /interesses/:id deve consultar interesse", async () => {
    const payload = { _id: testIds.administracao, status: "PENDENTE" };
    mockInteresseService.buscarPorId.mockResolvedValue(payload);

    const res = await request(app)
      .get(`/interesses/${testIds.administracao}`)
      .set("Authorization", bearer());

    expect(res.statusCode).toBe(200);
    expect(res.body.data).toEqual(payload);
    expect(mockInteresseService.buscarPorId).toHaveBeenCalledWith(
      testIds.administracao,
      expect.objectContaining({ id: testIds.interessado })
    );
  });

  test("deve rejeitar identificador de interesse invalido", async () => {
    const res = await request(app)
      .get("/interesses/id-invalido")
      .set("Authorization", bearer());

    expect(res.statusCode).toBe(400);
    expect(mockInteresseService.buscarPorId).not.toHaveBeenCalled();
  });

  test("deve aceitar e recusar interesse normalizando a resposta do doador", async () => {
    mockInteresseService.aceitar.mockResolvedValue({ _id: testIds.administracao, status: "ACEITO" });
    mockInteresseService.recusar.mockResolvedValue({ _id: testIds.administracao, status: "RECUSADO" });

    const aceite = await request(app)
      .put(`/interesses/${testIds.administracao}/aceitar`)
      .set("Authorization", bearer(createRegularUser({ id: testIds.doador })))
      .send({ mensagemResposta: "Item reservado." });
    const recusa = await request(app)
      .put(`/interesses/${testIds.administracao}/recusar`)
      .set("Authorization", bearer(createRegularUser({ id: testIds.doador })))
      .send({ respostaDoador: "Outro beneficiario foi selecionado." });

    expect(aceite.statusCode).toBe(200);
    expect(recusa.statusCode).toBe(200);
    expect(mockInteresseService.aceitar).toHaveBeenCalledWith(
      testIds.administracao,
      { resposta_doador: "Item reservado." },
      expect.objectContaining({ id: testIds.doador })
    );
    expect(mockInteresseService.recusar).toHaveBeenCalledWith(
      testIds.administracao,
      { resposta_doador: "Outro beneficiario foi selecionado." },
      expect.objectContaining({ id: testIds.doador })
    );
  });

  test("DELETE /interesses/:id deve cancelar interesse", async () => {
    mockInteresseService.cancelar.mockResolvedValue({ _id: testIds.administracao, status: "CANCELADO" });

    const res = await request(app)
      .delete(`/interesses/${testIds.administracao}`)
      .set("Authorization", bearer());

    expect(res.statusCode).toBe(200);
    expect(res.body.data.status).toBe("CANCELADO");
    expect(mockInteresseService.cancelar).toHaveBeenCalledWith(
      testIds.administracao,
      expect.objectContaining({ id: testIds.interessado })
    );
  });

  test("deve propagar erro operacional do service", async () => {
    mockInteresseService.aceitar.mockRejectedValue(new CustomError({
      statusCode: 403,
      customMessage: "Apenas o doador responsavel pode realizar esta operacao.",
    }));

    const res = await request(app)
      .put(`/interesses/${testIds.administracao}/aceitar`)
      .set("Authorization", bearer())
      .send({});

    expect(res.statusCode).toBe(403);
    expect(res.body.message).toBe("Apenas o doador responsavel pode realizar esta operacao.");
  });

  test.each([
    ["get", "/interesses/recebidos", "listarRecebidos", null],
    ["put", `/interesses/${testIds.administracao}/recusar`, "recusar", {}],
    ["delete", `/interesses/${testIds.administracao}`, "cancelar", null],
  ])("deve propagar falha de %s %s", async (method, url, serviceMethod, body) => {
    mockInteresseService[serviceMethod].mockRejectedValue(new CustomError({
      statusCode: 409,
      customMessage: "Conflito no interesse.",
    }));

    let requisicao = request(app)[method](url).set("Authorization", bearer());
    if (body !== null) requisicao = requisicao.send(body);
    const res = await requisicao;

    expect(res.statusCode).toBe(409);
    expect(res.body.message).toBe("Conflito no interesse.");
  });
});
