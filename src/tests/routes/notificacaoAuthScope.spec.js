import express from "express";
import request from "supertest";
import { beforeAll, beforeEach, describe, expect, jest, test } from "@jest/globals";
import { createAuthMiddleware } from "../../middlewares/createAuthMiddleware.js";
import errorHandler from "../../utils/helpers/errorHandler.js";
import NotificacaoRepository from "../../repositories/NotificacaoRepository.js";

let mockAuthMiddleware;
jest.mock("../mocks/AuthMiddleware.js", () => ({
  __esModule: true,
  default: (...args) => mockAuthMiddleware(...args),
}));
jest.mock("../../repositories/NotificacaoRepository.js", () => ({
  __esModule: true,
  default: {
    listarDoUsuario: jest.fn(), contarNaoLidas: jest.fn(),
    marcarComoLida: jest.fn(), marcarTodasComoLidas: jest.fn(),
  },
}));

let app;
let getSession;
const session = { session: { token: "session-token" }, user: { id: "usuario-1" } };
const endpoints = [
  ["get", "/notificacoes"],
  ["get", "/notificacoes/contador"],
  ["patch", "/notificacoes/notificacao-1/ler"],
  ["post", "/notificacoes/ler-tudo"],
];

beforeAll(async () => {
  const { default: router } = await import("../../routes/notificacaoRoutes.js");
  app = express();
  app.use(router);
  app.get(["/publico", "/notificacoes-publicas"], (req, res) =>
    res.json({ autenticado: Boolean(req.user) }));
  app.get("/perfil", (...args) => mockAuthMiddleware(...args), (req, res) =>
    res.json({ usuario: req.user.id }));
  app.use((req, res) => res.status(404).json({ autenticado: Boolean(req.user) }));
  app.use(errorHandler);
});

beforeEach(() => {
  getSession = jest.fn(async ({ headers }) => headers.get("authorization") === "Bearer session-token" ? session : null);
  mockAuthMiddleware = createAuthMiddleware({
    authClient: { api: { getSession } },
    usuarioRepository: { buscarPorId: jest.fn().mockResolvedValue({ _id: "usuario-1", situacao: "ATIVO" }) },
  });
  Object.values(NotificacaoRepository).forEach((fn) => fn.mockReset());
  NotificacaoRepository.listarDoUsuario.mockResolvedValue({ docs: [] });
  NotificacaoRepository.contarNaoLidas.mockResolvedValue(0);
  NotificacaoRepository.marcarComoLida.mockResolvedValue({ _id: "notificacao-1", lida: true });
  NotificacaoRepository.marcarTodasComoLidas.mockResolvedValue({ modifiedCount: 1 });
});

describe("Autenticação restrita ao prefixo de notificações", () => {
  test.each([
    ["/nao-existe", 404], ["/uploads/itens/ausente.png", 404],
    ["/publico", 200], ["/notificacoes-publicas", 200],
  ])("%s conserva status %i sem autenticação e sem contexto vazado", async (path, status) => {
    const semSessao = await request(app).get(path);
    const comSessao = await request(app).get(path).set("Authorization", "Bearer session-token");

    expect(semSessao.statusCode).toBe(status);
    expect(comSessao.statusCode).toBe(status);
    expect(semSessao.body).toEqual({ autenticado: false });
    expect(comSessao.body).toEqual({ autenticado: false });
  });

  test.each(endpoints)("%s %s continua protegido sem sessão", async (method, path) => {
    const res = await request(app)[method](path);
    expect(res.statusCode).toBe(498);
    expect(res.body.message).toBe("Token inválido ou expirado. Faça login novamente.");
  });

  test.each(endpoints)("%s %s alcança controller com sessão", async (method, path) => {
    const res = await request(app)[method](path).set("Authorization", "Bearer session-token");
    expect(res.statusCode).toBe(200);
  });

  test("rota desconhecida sob /notificacoes mantém autenticação e depois alcança 404", async () => {
    expect((await request(app).get("/notificacoes/ausente")).statusCode).toBe(498);
    const res = await request(app).get("/notificacoes/ausente").set("Authorization", "Bearer session-token");
    expect(res.statusCode).toBe(404);
    expect(res.body).toEqual({ autenticado: true });
  });

  test("rota vizinha protegida autentica apenas pelo próprio middleware", async () => {
    // Uma segunda consulta já não concede sessão: o router anterior não pode consumi-la.
    getSession.mockResolvedValueOnce(session).mockResolvedValue(null);
    const res = await request(app).get("/perfil").set("Authorization", "Bearer session-token");
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ usuario: "usuario-1" });
  });
});
