import request from "supertest";
import { beforeAll, beforeEach, describe, expect, jest, test } from "@jest/globals";
import {
  createControllerTestApp,
  createRegularUser,
  createTestBearer,
  testIds,
} from "../test.js";
import NotificacaoRepository from "../../repositories/NotificacaoRepository.js";

jest.mock("../../repositories/NotificacaoRepository.js", () => ({
  __esModule: true,
  default: {
    listarDoUsuario: jest.fn(),
    contarNaoLidas: jest.fn(),
    marcarComoLida: jest.fn(),
    marcarTodasComoLidas: jest.fn(),
    criar: jest.fn(),
    criarMuitas: jest.fn(),
  },
}));

let appUsuario;
const usuario = createRegularUser({ id: testIds.usuario });
const authorization = createTestBearer(usuario);

beforeAll(async () => {
  const { default: notificacaoRouter } = await import(
    "../../routes/notificacaoRoutes.js"
  );

  appUsuario = createControllerTestApp({
    user: usuario,
    registerRoutes: (app) => {
      app.use("/", notificacaoRouter);
    },
  });
});

beforeEach(() => {
  Object.values(NotificacaoRepository).forEach((mockFn) => {
    if (typeof mockFn?.mockReset === "function") mockFn.mockReset();
  });
});

describe("Rotas de Notificação (Repository mockado)", () => {
  test("GET /notificacoes retorna as notificações do usuário autenticado", async () => {
    const payload = { docs: [{ _id: testIds.administracao }] };
    NotificacaoRepository.listarDoUsuario.mockResolvedValue(payload);

    const res = await request(appUsuario)
      .get("/notificacoes?page=1&limit=10")
      .set("Authorization", authorization);

    expect(res.statusCode).toBe(200);
    expect(res.body.data).toEqual(payload);
  });

  test("GET /notificacoes/contador retorna a quantidade não lida", async () => {
    NotificacaoRepository.contarNaoLidas.mockResolvedValue(2);

    const res = await request(appUsuario)
      .get("/notificacoes/contador")
      .set("Authorization", authorization);

    expect(res.statusCode).toBe(200);
    expect(res.body.data).toEqual({ nao_lidas: 2 });
  });

  test("PATCH /notificacoes/:id/ler marca como lida", async () => {
    const payload = { _id: testIds.administracao, lida: true };
    NotificacaoRepository.marcarComoLida.mockResolvedValue(payload);

    const res = await request(appUsuario)
      .patch(`/notificacoes/${testIds.administracao}/ler`)
      .set("Authorization", authorization);

    expect(res.statusCode).toBe(200);
    expect(res.body.data).toEqual(payload);
  });

  test("POST /notificacoes/ler-tudo marca todas como lidas", async () => {
    NotificacaoRepository.marcarTodasComoLidas.mockResolvedValue({
      matchedCount: 2,
      modifiedCount: 2,
    });

    const res = await request(appUsuario)
      .post("/notificacoes/ler-tudo")
      .set("Authorization", authorization);

    expect(res.statusCode).toBe(200);
    expect(res.body.data).toEqual({ mensagem: "Marcado como Lidas" });
  });
});
