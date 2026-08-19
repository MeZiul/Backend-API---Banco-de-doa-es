import express from "express";
import jwt from "jsonwebtoken";
import request from "supertest";
import {
  beforeAll,
  beforeEach,
  describe,
  expect,
  jest,
  test,
} from "@jest/globals";

import errorHandler from "../../utils/helpers/errorHandler.js";
import {
  createAdminUser,
  createRegularUser,
  testIds,
} from "../test.js";

import PerfilRepository from "../../repositories/PerfilRepository.js";

const mockUsuarioRepositoryBuscarPorId = jest.fn();

jest.mock("../../repositories/PerfilRepository.js", () => ({
  __esModule: true,
  default: {
    atualizar: jest.fn(),
  },
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

const bearer = (user) =>
  `Bearer ${jwt.sign(
    user,
    process.env.JWT_SECRET_ACCESS_TOKEN,
  )}`;

const adminAuth = () => bearer(createAdminUser());

beforeAll(async () => {
  const { default: perfilRouter } = await import(
    "../../routes/perfilRoutes.js"
  );

  app = express();
  app.use(express.json());
  app.use(perfilRouter);
  app.use(errorHandler);
});

beforeEach(() => {
  PerfilRepository.atualizar.mockReset();
  mockUsuarioRepositoryBuscarPorId.mockReset();

  mockUsuarioRepositoryBuscarPorId.mockImplementation(
    async (id) => ({
      _id: id,
      id,
      perfil:
        id === testIds.admin
          ? "ADMINISTRADOR"
          : "USUARIO",
      situacao: "ATIVO",
    }),
  );
});

describe("Rotas de Perfil (Repository mockado)", () => {
  test(
    "PATCH /admin/usuarios/:id/perfil atualiza o acesso como administrador",
    async () => {
      PerfilRepository.atualizar.mockResolvedValue({
        _id: testIds.usuario,
        perfil: "ADMINISTRADOR",
        situacao: "ATIVO",
      });

      const res = await request(app)
        .patch(
          `/admin/usuarios/${testIds.usuario}/perfil`,
        )
        .set("Authorization", adminAuth())
        .send({
          perfil: "ADMINISTRADOR",
        });

      expect(res.statusCode).toBe(200);

      expect(
        PerfilRepository.atualizar,
      ).toHaveBeenCalledWith(
        testIds.usuario,
        {
          perfil: "ADMINISTRADOR",
        },
      );
    },
  );

  test("deve exigir autenticacao", async () => {
    const res = await request(app)
      .patch(
        `/admin/usuarios/${testIds.usuario}/perfil`,
      )
      .send({
        perfil: "ADMINISTRADOR",
      });

    expect(res.statusCode).toBe(498);

    expect(
      PerfilRepository.atualizar,
    ).not.toHaveBeenCalled();
  });

  test(
    "deve impedir usuario comum de alterar perfil",
    async () => {
      const res = await request(app)
        .patch(
          `/admin/usuarios/${testIds.usuario}/perfil`,
        )
        .set(
          "Authorization",
          bearer(createRegularUser()),
        )
        .send({
          perfil: "ADMINISTRADOR",
        });

      expect(res.statusCode).toBe(403);

      expect(
        PerfilRepository.atualizar,
      ).not.toHaveBeenCalled();
    },
  );
});