import express from "express";
import request from "supertest";
import { beforeAll, beforeEach, describe, expect, jest, test } from "@jest/globals";
import CustomError from "../../utils/helpers/CustomError.js";
import errorHandler from "../../utils/helpers/errorHandler.js";
import { createAdminUser, createRegularUser, createTestBearer, testIds } from "../test.js";

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

const mockUsuarioRepositoryBuscarPorId = jest.fn();

jest.mock("../../containers/services.index.js", () => ({
  administracaoService: mockAdministracaoService,
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

const bearer = (user) => createTestBearer(user);
const adminAuth = () => bearer(createAdminUser());

beforeAll(async () => {
  const { default: administracaoRoutes } = await import("../../routes/administracaoRoutes.js");
  app = express();
  app.use(express.json());
  app.use(administracaoRoutes);
  app.use(errorHandler);
});

beforeEach(() => {
  Object.values(mockAdministracaoService).forEach((mockFn) => mockFn.mockReset());
  mockUsuarioRepositoryBuscarPorId.mockReset();
  mockUsuarioRepositoryBuscarPorId.mockImplementation(async (id) => ({
    _id: id,
    perfil: id === testIds.admin ? "ADMINISTRADOR" : "USUARIO",
    situacao: "ATIVO",
  }));
});

describe("Endpoints de Administracao", () => {
  test("deve exigir autenticacao e perfil administrativo", async () => {
    const semToken = await request(app).get("/admin/administracoes");
    const usuarioComum = await request(app)
      .get("/admin/administracoes")
      .set("Authorization", bearer(createRegularUser()));

    expect(semToken.statusCode).toBe(498);
    expect(usuarioComum.statusCode).toBe(403);
    expect(mockAdministracaoService.listar).not.toHaveBeenCalled();
  });

  test("GET /admin/administracoes deve validar filtros e retornar lista", async () => {
    const payload = { docs: [{ _id: testIds.administracao }] };
    mockAdministracaoService.listar.mockResolvedValue(payload);

    const res = await request(app)
      .get("/admin/administracoes")
      .set("Authorization", adminAuth())
      .query({ page: 2, limit: 5, tipoAlvo: "USUARIO" });

    expect(res.statusCode).toBe(200);
    expect(res.body).toMatchObject({ data: payload, errors: [] });
    expect(mockAdministracaoService.listar).toHaveBeenCalledWith({
      filtros: { tipoAlvo: "USUARIO" },
      page: 2,
      limit: 5,
    }, expect.objectContaining({ id: testIds.admin, perfil: "ADMINISTRADOR" }));
  });

  test("deve rejeitar query administrativa invalida", async () => {
    const res = await request(app)
      .get("/admin/administracoes")
      .set("Authorization", adminAuth())
      .query({ page: 0, tipoAlvo: "INVALIDO" });

    expect(res.statusCode).toBe(400);
    expect(res.body.data).toBeNull();
    expect(res.body.errors.length).toBeGreaterThan(0);
    expect(mockAdministracaoService.listar).not.toHaveBeenCalled();
  });

  test("deve consultar acao, alvo e administrador por identificador", async () => {
    mockAdministracaoService.buscarPorId.mockResolvedValue({ _id: testIds.administracao });
    mockAdministracaoService.listarPorAlvo.mockResolvedValue({ docs: ["alvo"] });
    mockAdministracaoService.listarPorAdministrador.mockResolvedValue({ docs: ["admin"] });

    const acao = await request(app)
      .get(`/admin/administracoes/${testIds.administracao}`)
      .set("Authorization", adminAuth());
    const alvo = await request(app)
      .get(`/admin/alvos/${testIds.item}/administracoes`)
      .set("Authorization", adminAuth())
      .query({ page: 2, limite: 4 });
    const administrador = await request(app)
      .get(`/admin/administradores/${testIds.admin}/administracoes`)
      .set("Authorization", adminAuth())
      .query({ page: 3, limit: 6 });

    expect(acao.statusCode).toBe(200);
    expect(alvo.statusCode).toBe(200);
    expect(administrador.statusCode).toBe(200);
    expect(mockAdministracaoService.buscarPorId).toHaveBeenCalledWith(
      testIds.administracao,
      expect.objectContaining({ id: testIds.admin })
    );
    expect(mockAdministracaoService.listarPorAlvo).toHaveBeenCalledWith(
      testIds.item,
      { page: 2, limit: 4 },
      expect.objectContaining({ id: testIds.admin })
    );
    expect(mockAdministracaoService.listarPorAdministrador).toHaveBeenCalledWith(
      testIds.admin,
      { page: 3, limit: 6 },
      expect.objectContaining({ id: testIds.admin })
    );
  });

  test("deve rejeitar identificador administrativo invalido", async () => {
    const res = await request(app)
      .get("/admin/administracoes/id-invalido")
      .set("Authorization", adminAuth());

    expect(res.statusCode).toBe(400);
    expect(mockAdministracaoService.buscarPorId).not.toHaveBeenCalled();
  });

  test("deve listar e consultar usuarios", async () => {
    mockAdministracaoService.listarUsuarios.mockResolvedValue({ docs: [{ _id: testIds.usuario }] });
    mockAdministracaoService.buscarUsuarioPorId.mockResolvedValue({
      _id: testIds.usuario,
      historico: { itens: [], interesses: [], avaliacoes: [], denuncias: [] },
    });

    const lista = await request(app)
      .get("/admin/usuarios")
      .set("Authorization", adminAuth())
      .query({ nome: "Carlos", situacao: "ATIVO", page: 2, limit: 5 });
    const detalhe = await request(app)
      .get(`/admin/usuarios/${testIds.usuario}`)
      .set("Authorization", adminAuth());

    expect(lista.statusCode).toBe(200);
    expect(detalhe.statusCode).toBe(200);
    expect(detalhe.body.data.historico).toEqual({
      itens: [],
      interesses: [],
      avaliacoes: [],
      denuncias: [],
    });
    expect(mockAdministracaoService.listarUsuarios).toHaveBeenCalledWith({
      filtros: { nome: "Carlos", situacao: "ATIVO" },
      page: 2,
      limit: 5,
    }, expect.objectContaining({ id: testIds.admin }));
    expect(mockAdministracaoService.buscarUsuarioPorId).toHaveBeenCalledWith(
      testIds.usuario,
      expect.objectContaining({ id: testIds.admin })
    );
  });

  test("deve bloquear, desbloquear e inativar usuario", async () => {
    mockAdministracaoService.bloquearUsuario.mockResolvedValue({ _id: testIds.usuario, situacao: "SUSPENSO" });
    mockAdministracaoService.desbloquearUsuario.mockResolvedValue({ _id: testIds.usuario, situacao: "ATIVO" });
    mockAdministracaoService.inativarUsuario.mockResolvedValue({ _id: testIds.usuario, situacao: "INATIVO" });

    const bloqueio = await request(app)
      .put(`/admin/usuarios/${testIds.usuario}/bloquear`)
      .set("Authorization", adminAuth())
      .send({ justificativa: "Violacao das regras", suspensaoAte: "2026-12-31T00:00:00.000Z" });
    const desbloqueio = await request(app)
      .put(`/admin/usuarios/${testIds.usuario}/desbloquear`)
      .set("Authorization", adminAuth())
      .send({ acaoTomada: "Usuario reativado." });
    const inativacao = await request(app)
      .delete(`/admin/usuarios/${testIds.usuario}`)
      .set("Authorization", adminAuth())
      .send({ respostaAdmin: "Conta inativada." });

    expect(bloqueio.statusCode).toBe(200);
    expect(desbloqueio.statusCode).toBe(200);
    expect(inativacao.statusCode).toBe(200);
    expect(mockAdministracaoService.bloquearUsuario).toHaveBeenCalledWith(
      testIds.usuario,
      expect.objectContaining({
        justificativa: "Violacao das regras",
        suspensao_ate: "2026-12-31T00:00:00.000Z",
      }),
      expect.objectContaining({ id: testIds.admin })
    );
    expect(mockAdministracaoService.desbloquearUsuario).toHaveBeenCalledWith(
      testIds.usuario,
      expect.objectContaining({ acao_tomada: "Usuario reativado." }),
      expect.objectContaining({ id: testIds.admin })
    );
    expect(mockAdministracaoService.inativarUsuario).toHaveBeenCalledWith(
      testIds.usuario,
      expect.objectContaining({ resposta_administrativa: "Conta inativada." }),
      expect.objectContaining({ id: testIds.admin })
    );
  });

  test("deve exigir justificativa no bloqueio", async () => {
    const res = await request(app)
      .put(`/admin/usuarios/${testIds.usuario}/bloquear`)
      .set("Authorization", adminAuth())
      .send({});

    expect(res.statusCode).toBe(400);
    expect(mockAdministracaoService.bloquearUsuario).not.toHaveBeenCalled();
  });

  test("deve rejeitar data de suspensao invalida antes de chamar o service", async () => {
    const res = await request(app)
      .put(`/admin/usuarios/${testIds.usuario}/bloquear`)
      .set("Authorization", adminAuth())
      .send({ justificativa: "Violacao das regras", suspensaoAte: "2026-99-99" });

    expect(res.statusCode).toBe(400);
    expect(mockAdministracaoService.bloquearUsuario).not.toHaveBeenCalled();
  });

  test("deve listar e cancelar itens", async () => {
    mockAdministracaoService.listarItens.mockResolvedValue({ docs: [{ _id: testIds.item }] });
    mockAdministracaoService.cancelarItem.mockResolvedValue({ _id: testIds.item, status: "CANCELADO" });

    const lista = await request(app)
      .get("/admin/itens")
      .set("Authorization", adminAuth())
      .query({ status: "DISPONIVEL", page: 2, limit: 5, ordenacao: "antigos" });
    const cancelamento = await request(app)
      .put(`/admin/itens/${testIds.item}/cancelar`)
      .set("Authorization", adminAuth())
      .send({ acaoTomada: "Item irregular." });

    expect(lista.statusCode).toBe(200);
    expect(cancelamento.statusCode).toBe(200);
    expect(mockAdministracaoService.listarItens).toHaveBeenCalledWith({
      filtros: { status: "DISPONIVEL" },
      page: 2,
      limit: 5,
      ordenacao: "antigos",
    }, expect.objectContaining({ id: testIds.admin }));
    expect(mockAdministracaoService.cancelarItem).toHaveBeenCalledWith(
      testIds.item,
      expect.objectContaining({ acao_tomada: "Item irregular." }),
      expect.objectContaining({ id: testIds.admin })
    );
  });

  test("deve listar e resolver denuncias", async () => {
    mockAdministracaoService.listarDenuncias.mockResolvedValue({ docs: [{ _id: testIds.denuncia }] });
    mockAdministracaoService.resolverDenuncia.mockResolvedValue({ _id: testIds.denuncia, status: "PROCEDENTE" });

    const lista = await request(app)
      .get("/admin/denuncias")
      .set("Authorization", adminAuth())
      .query({ status: "EM_ANALISE", page: 1, limit: 10 });
    const resolucao = await request(app)
      .put(`/admin/denuncias/${testIds.denuncia}/resolver`)
      .set("Authorization", adminAuth())
      .send({ resultado: "PROCEDENTE", respostaAdmin: "Denuncia confirmada." });

    expect(lista.statusCode).toBe(200);
    expect(resolucao.statusCode).toBe(200);
    expect(mockAdministracaoService.listarDenuncias).toHaveBeenCalledWith({
      filtros: { status: "EM_ANALISE" },
      page: 1,
      limit: 10,
    }, expect.objectContaining({ id: testIds.admin }));
    expect(mockAdministracaoService.resolverDenuncia).toHaveBeenCalledWith(
      testIds.denuncia,
      expect.objectContaining({
        resultado_denuncia: "PROCEDENTE",
        resposta_administrativa: "Denuncia confirmada.",
      }),
      expect.objectContaining({ id: testIds.admin })
    );
  });

  test("deve validar resultado e propagar erro operacional da resolucao", async () => {
    const invalido = await request(app)
      .put(`/admin/denuncias/${testIds.denuncia}/resolver`)
      .set("Authorization", adminAuth())
      .send({});

    mockAdministracaoService.resolverDenuncia.mockRejectedValue(new CustomError({
      statusCode: 409,
      customMessage: "Denuncia ja resolvida.",
    }));
    const conflito = await request(app)
      .put(`/admin/denuncias/${testIds.denuncia}/resolver`)
      .set("Authorization", adminAuth())
      .send({ resultado: "IMPROCEDENTE" });

    expect(invalido.statusCode).toBe(400);
    expect(conflito.statusCode).toBe(409);
    expect(conflito.body.message).toBe("Denuncia ja resolvida.");
  });

  test.each([
    ["get", `/admin/alvos/${testIds.item}/administracoes`, "listarPorAlvo", null],
    ["get", `/admin/administradores/${testIds.admin}/administracoes`, "listarPorAdministrador", null],
    ["get", "/admin/usuarios", "listarUsuarios", null],
    ["get", `/admin/usuarios/${testIds.usuario}`, "buscarUsuarioPorId", null],
    ["get", "/admin/itens", "listarItens", null],
    ["get", "/admin/denuncias", "listarDenuncias", null],
    ["put", `/admin/usuarios/${testIds.usuario}/desbloquear`, "desbloquearUsuario", {}],
    ["delete", `/admin/usuarios/${testIds.usuario}`, "inativarUsuario", {}],
    ["put", `/admin/itens/${testIds.item}/cancelar`, "cancelarItem", {}],
  ])("deve propagar falha de %s %s", async (method, url, serviceMethod, body) => {
    mockAdministracaoService[serviceMethod].mockRejectedValue(new CustomError({
      statusCode: 409,
      customMessage: "Conflito administrativo.",
    }));

    let requisicao = request(app)[method](url).set("Authorization", adminAuth());
    if (body !== null) requisicao = requisicao.send(body);
    const res = await requisicao;

    expect(res.statusCode).toBe(409);
    expect(res.body.message).toBe("Conflito administrativo.");
  });
});
