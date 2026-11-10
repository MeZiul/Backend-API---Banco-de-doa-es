import http from "node:http";
import express from "express";
import request from "supertest";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, jest, test } from "@jest/globals";
import errorHandler from "../../utils/helpers/errorHandler.js";
import { createAdminUser, createRegularUser, createTestBearer, testIds } from "../test.js";

const METRICAS = { usuarios: 10, ativos: 8, itens: 7, disponiveis: 4, doados: 2, denuncias: 3, atualizado_em: "2026-11-10T12:00:00.000Z" };

const mockMetricasService = {
  calcular: jest.fn(),
  assinar: jest.fn(),
};
const mockUsuarioRepositoryBuscarPorId = jest.fn();

jest.mock("../../containers/services.index.js", () => ({ administracaoService: {} }));
jest.mock("../../containers/services.metricas.container.js", () => ({ metricasService: mockMetricasService }));
jest.mock("../../repositories/UsuarioRepository.js", () => ({
  __esModule: true,
  default: class MockUsuarioRepository {
    buscarPorId(...args) {
      return mockUsuarioRepositoryBuscarPorId(...args);
    }
  },
}));

// Lê o stream de verdade: guarda o texto recebido e os eventos "metricas" já completos.
function abrirStream(servidor, caminho, headers = {}) {
  const { port } = servidor.address();
  return new Promise((resolve, reject) => {
    const req = http.get({ host: "127.0.0.1", port, path: caminho, headers }, (res) => {
      const leitor = { req, res, texto: "", fechado: false };
      res.setEncoding("utf8");
      res.on("data", (parte) => { leitor.texto += parte; });
      res.on("end", () => { leitor.fechado = true; });
      resolve(leitor);
    });
    req.on("error", reject);
  });
}

function eventos(leitor) {
  return leitor.texto
    .split("\n\n")
    .filter((bloco) => bloco.startsWith("event: metricas"))
    .map((bloco) => JSON.parse(bloco.split("\n").find((linha) => linha.startsWith("data: ")).slice(6)));
}

async function esperarAte(condicao, limiteMs = 2000) {
  const inicio = Date.now();
  while (!condicao()) {
    if (Date.now() - inicio > limiteMs) throw new Error("Tempo esgotado esperando o stream.");
    await new Promise((resolver) => setTimeout(resolver, 10));
  }
}

const adminAuth = () => createTestBearer(createAdminUser());

let app;
let servidor;
const abertos = [];

beforeAll(async () => {
  const { default: administracaoRoutes } = await import("../../routes/administracaoRoutes.js");
  app = express();
  app.use(administracaoRoutes);
  app.use(errorHandler);
  servidor = app.listen(0, "127.0.0.1");
  await new Promise((resolver) => servidor.once("listening", resolver));
});

afterAll(async () => {
  await new Promise((resolver) => servidor.close(resolver));
});

let aoMudar;
let cancelarAssinatura;

beforeEach(() => {
  mockMetricasService.calcular.mockReset().mockResolvedValue(METRICAS);
  cancelarAssinatura = jest.fn();
  mockMetricasService.assinar.mockReset().mockImplementation((callback) => {
    aoMudar = callback;
    return cancelarAssinatura;
  });
  mockUsuarioRepositoryBuscarPorId.mockReset().mockImplementation(async (id) => ({
    _id: id,
    perfil: id === testIds.admin ? "ADMINISTRADOR" : "USUARIO",
    situacao: "ATIVO",
  }));
});

afterEach(async () => {
  for (const leitor of abertos.splice(0)) leitor.req.destroy();
  // Dá tempo para o servidor processar o fechamento das conexões.
  await new Promise((resolver) => setTimeout(resolver, 30));
});

async function abrirComoAdmin() {
  const leitor = await abrirStream(servidor, "/admin/metricas/stream", { Authorization: adminAuth() });
  abertos.push(leitor);
  return leitor;
}

describe("GET /admin/metricas", () => {
  test("exige autenticação e perfil administrativo", async () => {
    const semToken = await request(app).get("/admin/metricas");
    const usuarioComum = await request(app)
      .get("/admin/metricas")
      .set("Authorization", createTestBearer(createRegularUser()));

    expect(semToken.statusCode).toBe(498);
    expect(usuarioComum.statusCode).toBe(403);
    expect(mockMetricasService.calcular).not.toHaveBeenCalled();
  });

  test("devolve os contadores para o administrador", async () => {
    const res = await request(app).get("/admin/metricas").set("Authorization", adminAuth());

    expect(res.statusCode).toBe(200);
    expect(res.body).toMatchObject({ data: METRICAS, errors: [] });
  });
});

describe("GET /admin/metricas/stream", () => {
  test("exige autenticação e perfil administrativo", async () => {
    const semToken = await request(app).get("/admin/metricas/stream");
    const usuarioComum = await request(app)
      .get("/admin/metricas/stream")
      .set("Authorization", createTestBearer(createRegularUser()));

    expect(semToken.statusCode).toBe(498);
    expect(usuarioComum.statusCode).toBe(403);
    expect(mockMetricasService.assinar).not.toHaveBeenCalled();
  });

  test("abre o stream com headers anti-buffer, preenchimento, retry e os contadores atuais", async () => {
    const leitor = await abrirComoAdmin();
    await esperarAte(() => eventos(leitor).length === 1);

    expect(leitor.res.statusCode).toBe(200);
    expect(leitor.res.headers["content-type"]).toMatch(/^text\/event-stream/);
    expect(leitor.res.headers["cache-control"]).toBe("no-cache, no-transform");
    expect(leitor.res.headers["x-accel-buffering"]).toBe("no");
    expect(leitor.texto.indexOf("\n\n")).toBeGreaterThan(1024);
    expect(leitor.texto).toContain("retry: 5000\n\n");
    expect(eventos(leitor)[0]).toEqual(METRICAS);
  });

  test("envia um novo evento quando as métricas mudam", async () => {
    const leitor = await abrirComoAdmin();
    await esperarAte(() => eventos(leitor).length === 1);

    await aoMudar({ ...METRICAS, denuncias: 4 });
    await esperarAte(() => eventos(leitor).length === 2);

    expect(eventos(leitor)[1]).toMatchObject({ denuncias: 4 });
  });

  test("encerra o stream quando a conta deixa de ser administradora", async () => {
    const leitor = await abrirComoAdmin();
    await esperarAte(() => eventos(leitor).length === 1);
    mockUsuarioRepositoryBuscarPorId.mockResolvedValue({ _id: testIds.admin, perfil: "USUARIO", situacao: "ATIVO" });

    await aoMudar({ ...METRICAS, denuncias: 4 });
    await esperarAte(() => leitor.fechado);

    expect(eventos(leitor)).toHaveLength(1);
    expect(cancelarAssinatura).toHaveBeenCalled();
  });

  test("fechar a conexão no navegador cancela a assinatura", async () => {
    const leitor = await abrirComoAdmin();
    await esperarAte(() => eventos(leitor).length === 1);

    leitor.req.destroy();
    await esperarAte(() => cancelarAssinatura.mock.calls.length === 1);
  });

  test("limita a 3 conexões simultâneas por usuário", async () => {
    for (let i = 0; i < 3; i += 1) {
      const leitor = await abrirComoAdmin();
      await esperarAte(() => eventos(leitor).length === 1);
    }

    const quarta = await request(app).get("/admin/metricas/stream").set("Authorization", adminAuth());

    expect(quarta.statusCode).toBe(429);
  });

  test("falha ao calcular as métricas responde erro sem abrir o stream", async () => {
    mockMetricasService.calcular.mockRejectedValue(new Error("banco indisponível"));

    const res = await request(app).get("/admin/metricas/stream").set("Authorization", adminAuth());

    expect(res.statusCode).toBe(500);
    expect(mockMetricasService.assinar).not.toHaveBeenCalled();
  });
});

describe("Manutenção da conexão SSE", () => {
  test("envia heartbeat e encerra após a duração máxima", async () => {
    const { criarMetricasController } = await import("../../controllers/MetricasController.js");
    const controller = criarMetricasController({
      metricasService: { calcular: jest.fn().mockResolvedValue(METRICAS), assinar: jest.fn(() => jest.fn()) },
      usuarioRepository: { buscarPorId: jest.fn() },
      heartbeatMs: 20,
      duracaoMaximaMs: 120,
    });
    const appCurto = express();
    appCurto.get("/stream", (req, _res, next) => {
      req.user = { id: testIds.admin };
      next();
    }, controller.stream);
    const servidorCurto = appCurto.listen(0, "127.0.0.1");
    await new Promise((resolver) => servidorCurto.once("listening", resolver));

    const leitor = await abrirStream(servidorCurto, "/stream");
    await esperarAte(() => leitor.fechado);

    expect(leitor.texto).toContain(": ping\n\n");
    expect(eventos(leitor)).toHaveLength(1);
    await new Promise((resolver) => servidorCurto.close(resolver));
  });
});
