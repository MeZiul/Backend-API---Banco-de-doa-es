import express from "express";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, jest, test } from "@jest/globals";

jest.mock("dotenv", () => ({
  __esModule: true,
  default: { config: jest.fn() },
}));

jest.mock("../../docs/scalar.js", () => ({
  registerApiReference: jest.fn(),
}));

jest.mock("../../routes/usuarioRoutes.js", () => ({ __esModule: true, default: (_req, _res, next) => next() }));
jest.mock("../../routes/categoriaRoutes.js", () => ({ __esModule: true, default: (_req, _res, next) => next() }));
jest.mock("../../routes/avaliacaoRoutes.js", () => ({ __esModule: true, default: (_req, _res, next) => next() }));
jest.mock("../../routes/authRoutes.js", () => ({ __esModule: true, default: (_req, _res, next) => next() }));
jest.mock("../../routes/itemDoacaoRoutes.js", () => ({ __esModule: true, default: (_req, _res, next) => next() }));
jest.mock("../../routes/interesseRoutes.js", () => ({ __esModule: true, default: (_req, _res, next) => next() }));
jest.mock("../../routes/denunciaRoutes.js", () => ({ __esModule: true, default: (_req, _res, next) => next() }));
jest.mock("../../routes/administracaoRoutes.js", () => ({ __esModule: true, default: (_req, _res, next) => next() }));
jest.mock("../../routes/notificacaoRoutes.js", () => ({ __esModule: true, default: (_req, _res, next) => next() }));
jest.mock("../../routes/perfilRoutes.js", () => ({ __esModule: true, default: (_req, _res, next) => next() }));

const originalDebugLog = process.env.DEBUGLOG;
let registerRoutes;

beforeAll(async () => {
  ({ default: registerRoutes } = await import("../../routes/index.js"));
});

afterAll(() => {
  if (originalDebugLog === undefined) {
    delete process.env.DEBUGLOG;
  } else {
    process.env.DEBUGLOG = originalDebugLog;
  }
});

function buildApp(debugLog) {
  if (debugLog === undefined) {
    delete process.env.DEBUGLOG;
  } else {
    process.env.DEBUGLOG = debugLog;
  }

  const app = express();
  app.set("trust proxy", 0);
  registerRoutes(app);
  app.get("/__route-privacy-probe", (req, res) => {
    res.json({
      ip: req.ip,
      method: req.method,
      originalUrl: req.originalUrl,
      host: req.get("host"),
      forwardedFor: req.get("x-forwarded-for"),
    });
  });
  return app;
}

describe("privacidade do log de rotas", () => {
  test.each([
    ["ausente", undefined],
    ["false", "false"],
  ])("não registra requests quando DEBUGLOG está %s", async (_label, setting) => {
    const log = jest.spyOn(console, "log").mockImplementation(() => {});
    const response = await request(buildApp(setting))
      .get("/__route-privacy-probe?token=query-marker")
      .set("Host", "host-marker.example")
      .set("X-Forwarded-For", "198.51.100.77");

    expect(response.status).toBe(200);
    expect(response.body.originalUrl).toBe("/__route-privacy-probe?token=query-marker");
    expect(response.body.host).toBe("host-marker.example");
    expect(response.body.forwardedFor).toBe("198.51.100.77");
    expect(log).not.toHaveBeenCalled();
  });

  test("registra método, caminho e IP resolvido pelo Express sem expor entrada não confiável", async () => {
    const log = jest.spyOn(console, "log").mockImplementation(() => {});
    const response = await request(buildApp("true"))
      .get("/__route-privacy-probe?token=query-marker")
      .set("Host", "host-marker.example")
      .set("X-Forwarded-For", "198.51.100.77");

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      method: "GET",
      originalUrl: "/__route-privacy-probe?token=query-marker",
      host: "host-marker.example",
      forwardedFor: "198.51.100.77",
    });
    expect(log).toHaveBeenCalledTimes(1);

    const line = log.mock.calls[0].join(" ");
    expect(line).toContain(response.body.ip);
    expect(line).toContain("GET /__route-privacy-probe");
    expect(line).not.toContain("query-marker");
    expect(line).not.toContain("host-marker.example");
    expect(line).not.toContain("198.51.100.77");
  });
});
