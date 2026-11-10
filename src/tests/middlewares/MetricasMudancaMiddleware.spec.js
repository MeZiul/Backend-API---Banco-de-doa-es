import express from "express";
import request from "supertest";
import { describe, expect, jest, test } from "@jest/globals";
import { criarMetricasMudancaMiddleware } from "../../middlewares/MetricasMudancaMiddleware.js";

function criarApp(servico) {
  const app = express();
  app.use(criarMetricasMudancaMiddleware(servico));
  app.all("/status/:codigo", (req, res) => res.status(Number(req.params.codigo)).end());
  return app;
}

describe("MetricasMudancaMiddleware", () => {
  test.each([
    ["POST", 201],
    ["PUT", 200],
    ["PATCH", 200],
    ["DELETE", 204],
  ])("%s com status %i avisa o dashboard", async (metodo, status) => {
    const servico = { notificarMudanca: jest.fn() };
    await request(criarApp(servico))[metodo.toLowerCase()](`/status/${status}`);

    expect(servico.notificarMudanca).toHaveBeenCalledTimes(1);
  });

  test.each([
    ["GET", 200],
    ["POST", 400],
    ["PUT", 403],
    ["DELETE", 500],
  ])("%s com status %i não avisa o dashboard", async (metodo, status) => {
    const servico = { notificarMudanca: jest.fn() };
    await request(criarApp(servico))[metodo.toLowerCase()](`/status/${status}`);

    expect(servico.notificarMudanca).not.toHaveBeenCalled();
  });
});
