import express from "express";
import request from "supertest";
import { beforeAll, beforeEach, describe, expect, jest, test } from "@jest/globals";
import CustomError from "../../utils/helpers/CustomError.js";
import errorHandler from "../../utils/helpers/errorHandler.js";
import { createAdminUser, createRegularUser, createTestBearer, testIds } from "../test.js";

const mockCategoriaService = {
  listar: jest.fn(),
  buscarPorId: jest.fn(),
  criar: jest.fn(),
  atualizar: jest.fn(),
  deletar: jest.fn(),
};

jest.mock("../../containers/services.index.js", () => ({
  categoriaService: mockCategoriaService,
}));

let app;

const bearer = (user) => createTestBearer(user);
const adminAuth = () => bearer(createAdminUser());
const usuarioAuth = () => bearer(createRegularUser({ id: testIds.usuario }));

const categoriaId = "507f1f77bcf86cd799439030";

beforeAll(async () => {
  const { default: categoriaRoutes } = await import("../../routes/categoriaRoutes.js");
  app = express();
  app.use(express.json());
  app.use(categoriaRoutes);
  app.use(errorHandler);
});

beforeEach(() => {
  Object.values(mockCategoriaService).forEach((fn) => fn.mockReset());
});

describe("Rotas de Categoria", () => {
  describe("GET /categorias — listar (publico)", () => {
    test("retorna 200 com lista paginada", async () => {
      mockCategoriaService.listar.mockResolvedValue({
        docs: [{ _id: categoriaId, nome: "Roupas" }],
        totalDocs: 1,
        page: 1,
      });

      const res = await request(app).get("/categorias");

      expect(res.statusCode).toBe(200);
      expect(res.body.data.docs).toHaveLength(1);
      expect(mockCategoriaService.listar).toHaveBeenCalledTimes(1);
    });

    test("aceita filtros de query (nome, ativo)", async () => {
      mockCategoriaService.listar.mockResolvedValue({ docs: [], totalDocs: 0 });

      const res = await request(app)
        .get("/categorias")
        .query({ nome: "Roupas", ativo: "true" });

      expect(res.statusCode).toBe(200);
    });
  });

  describe("GET /categorias/:id — buscar por ID (publico)", () => {
    test("retorna 200 com categoria encontrada", async () => {
      mockCategoriaService.buscarPorId.mockResolvedValue({
        _id: categoriaId,
        nome: "Roupas",
      });

      const res = await request(app).get(`/categorias/${categoriaId}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.data._id).toBe(categoriaId);
    });

    test("retorna 404 se categoria nao existe", async () => {
      mockCategoriaService.buscarPorId.mockRejectedValue(
        new CustomError({ statusCode: 404, customMessage: "Categoria não encontrada." }),
      );

      const res = await request(app).get(`/categorias/${categoriaId}`);

      expect(res.statusCode).toBe(404);
    });
  });

  describe("POST /categorias — criar (admin)", () => {
    test("retorna 498 sem token", async () => {
      const res = await request(app).post("/categorias").send({ nome: "Roupas" });

      expect(res.statusCode).toBe(498);
      expect(mockCategoriaService.criar).not.toHaveBeenCalled();
    });

    test("retorna 403 se nao for admin", async () => {
      const res = await request(app)
        .post("/categorias")
        .set("Authorization", usuarioAuth())
        .send({ nome: "Roupas" });

      expect(res.statusCode).toBe(403);
      expect(mockCategoriaService.criar).not.toHaveBeenCalled();
    });

    test("retorna 201 ao criar categoria como admin", async () => {
      mockCategoriaService.criar.mockResolvedValue({
        _id: categoriaId,
        nome: "Roupas",
        ativo: true,
      });

      const res = await request(app)
        .post("/categorias")
        .set("Authorization", adminAuth())
        .send({ nome: "Roupas", descricao: "Roupas em geral" });

      expect(res.statusCode).toBe(201);
      expect(res.body.data.nome).toBe("Roupas");
    });

    test("retorna 409 se nome ja existe", async () => {
      mockCategoriaService.criar.mockRejectedValue(
        new CustomError({
          statusCode: 409,
          customMessage: "Já existe uma categoria com este nome.",
        }),
      );

      const res = await request(app)
        .post("/categorias")
        .set("Authorization", adminAuth())
        .send({ nome: "Roupas" });

      expect(res.statusCode).toBe(409);
    });
  });

  describe("PUT /categorias/:id — atualizar (admin)", () => {
    test("retorna 403 se nao for admin", async () => {
      const res = await request(app)
        .put(`/categorias/${categoriaId}`)
        .set("Authorization", usuarioAuth())
        .send({ nome: "Roupas Novas" });

      expect(res.statusCode).toBe(403);
      expect(mockCategoriaService.atualizar).not.toHaveBeenCalled();
    });

    test("retorna 200 ao atualizar como admin", async () => {
      mockCategoriaService.atualizar.mockResolvedValue({
        _id: categoriaId,
        nome: "Roupas Novas",
      });

      const res = await request(app)
        .put(`/categorias/${categoriaId}`)
        .set("Authorization", adminAuth())
        .send({ nome: "Roupas Novas" });

      expect(res.statusCode).toBe(200);
      expect(res.body.data.nome).toBe("Roupas Novas");
    });

    test("retorna 404 se categoria nao existe", async () => {
      mockCategoriaService.atualizar.mockRejectedValue(
        new CustomError({ statusCode: 404, customMessage: "Categoria não encontrada." }),
      );

      const res = await request(app)
        .put(`/categorias/${categoriaId}`)
        .set("Authorization", adminAuth())
        .send({ nome: "Qualquer" });

      expect(res.statusCode).toBe(404);
    });
  });

  describe("DELETE /categorias/:id — deletar (admin)", () => {
    test("retorna 403 se nao for admin", async () => {
      const res = await request(app)
        .delete(`/categorias/${categoriaId}`)
        .set("Authorization", usuarioAuth());

      expect(res.statusCode).toBe(403);
      expect(mockCategoriaService.deletar).not.toHaveBeenCalled();
    });

    test("retorna 204 ao deletar como admin", async () => {
      mockCategoriaService.deletar.mockResolvedValue({ _id: categoriaId });

      const res = await request(app)
        .delete(`/categorias/${categoriaId}`)
        .set("Authorization", adminAuth());

      expect(res.statusCode).toBe(204);
    });

    test("retorna 404 se categoria nao existe", async () => {
      mockCategoriaService.deletar.mockRejectedValue(
        new CustomError({ statusCode: 404, customMessage: "Categoria não encontrada." }),
      );

      const res = await request(app)
        .delete(`/categorias/${categoriaId}`)
        .set("Authorization", adminAuth());

      expect(res.statusCode).toBe(404);
    });
  });
});
