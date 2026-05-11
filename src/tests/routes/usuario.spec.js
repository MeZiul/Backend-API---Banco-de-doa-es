import request from "supertest";
import {beforeEach,describe,expect,jest,test} from "@jest/globals";
import CustomError from "../../utils/helpers/CustomError.js";
import {
  createControllerTestApp,
  createRegularUser,
  createAdminUser,
  testIds,
} from "../test.js";

const mockUsuarioService = {
  cadastrar: jest.fn(),
  listar: jest.fn(),
  buscarPorId: jest.fn(),
  atualizar: jest.fn(),
  excluir: jest.fn(),
  suspender: jest.fn(),
  reativar: jest.fn(),
  listarItens: jest.fn(),
  listarAvaliacoes: jest.fn(),
};

jest.mock("../../containers/services.index.js", () => ({
  usuarioService: mockUsuarioService,
}));

let appUsuario;
let appAdmin;

beforeAll(async () => {
  const { default: UsuarioController } =
    await import("../../controllers/UsuarioController.js");
  const ctrl = new UsuarioController();

  appUsuario = createControllerTestApp({
    user: createRegularUser({ id: testIds.usuario }),
    registerRoutes: (app) => {
      app.post("/usuario", ctrl.cadastrar);
      app.get("/usuario", ctrl.listar);
      app.get("/usuario/:id/itens", ctrl.listarItens);
      app.get("/usuario/:id/avaliacoes", ctrl.listarAvaliacoes);
      app.get("/usuario/:id", ctrl.buscarPorId);
      app.put("/usuario/:id", ctrl.atualizar);
      app.patch("/usuario/:id", ctrl.atualizarParcial);
      app.delete("/usuario/:id", ctrl.excluir);
    },
  });

  appAdmin = createControllerTestApp({
    user: createAdminUser(),
    registerRoutes: (app) => {
      app.patch("/usuario/:id/suspender", ctrl.suspender);
      app.patch("/usuario/:id/reativar", ctrl.reativar);
    },
  });
});

beforeEach(() => {
  Object.values(mockUsuarioService).forEach((fn) => fn.mockReset());
});

describe("Rotas de Usuario", () => {
  describe("POST /usuario — cadastrar", () => {
    test("retorna 201 com usuario criado — RF-001", async () => {
      const payload = {
        _id: testIds.usuario,
        nome: "Teste Silva",
        email: "teste@email.com",
        perfil: "USUARIO",
        situacao: "ATIVO",
      };
      mockUsuarioService.cadastrar.mockResolvedValue({
        toObject: () => payload,
      });

      const res = await request(appUsuario).post("/usuario").send({
        nome: "Teste Silva",
        email: "teste@email.com",
        cpf: "123.456.789-09",
        senha: "Teste@123",
        cidade: "Porto Velho",
        uf: "RO",
      });

      expect(res.statusCode).toBe(201);
      expect(res.body.data.email).toBe("teste@email.com");
      expect(res.body.data.senha).toBeUndefined();
    });

    test("retorna 400 se email duplicado — RN-USR-006", async () => {
      mockUsuarioService.cadastrar.mockRejectedValue(
        new CustomError({
          statusCode: 400,
          customMessage:
            "E-mail já cadastrado. Faça login ou recupere sua senha.",
        }),
      );

      const res = await request(appUsuario).post("/usuario").send({
        nome: "Usuario",
        email: "existe@email.com",
        cpf: "111.111.111-11",
        senha: "Teste@123",
        cidade: "RO",
        uf: "RO",
      });

      expect(res.statusCode).toBe(400);
      expect(res.body.message).toBe(
        "E-mail já cadastrado. Faça login ou recupere sua senha.",
      );
    });

    test("retorna 422 se campos obrigatorios ausentes", async () => {
      const res = await request(appUsuario)
        .post("/usuario")
        .send({ email: "teste@email.com" });

      expect(res.statusCode).toBe(400);
    });
  });

  describe("GET /usuario — listar", () => {
    test("retorna 200 com lista paginada — RF-014", async () => {
      mockUsuarioService.listar.mockResolvedValue({
        docs: [{ _id: testIds.usuario, nome: "Teste" }],
        totalDocs: 1,
        page: 1,
      });

      const res = await request(appUsuario).get("/usuario");

      expect(res.statusCode).toBe(200);
      expect(res.body.data.docs).toHaveLength(1);
    });
  });

  describe("GET /usuario/:id — buscar por ID", () => {
    test("retorna 200 com usuario encontrado — RF-014", async () => {
      mockUsuarioService.buscarPorId.mockResolvedValue({
        _id: testIds.usuario,
        nome: "Teste",
      });

      const res = await request(appUsuario).get(`/usuario/${testIds.usuario}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.data._id).toBe(testIds.usuario);
    });

    test("retorna 404 se usuario nao existe", async () => {
      mockUsuarioService.buscarPorId.mockRejectedValue(
        new CustomError({
          statusCode: 404,
          customMessage: "Usuário não encontrado.",
        }),
      );

      const res = await request(appUsuario).get(`/usuario/${testIds.usuario}`);

      expect(res.statusCode).toBe(404);
    });
  });

  describe("PUT /usuario/:id — atualizar", () => {
    test("retorna 200 com usuario atualizado — RF-004", async () => {
      const payload = { _id: testIds.usuario, nome: "Novo Nome" };
      mockUsuarioService.atualizar.mockResolvedValue({
        toObject: () => payload,
      });

      const res = await request(appUsuario)
        .put(`/usuario/${testIds.usuario}`)
        .send({ nome: "Novo Nome" });

      expect(res.statusCode).toBe(200);
      expect(res.body.data.nome).toBe("Novo Nome");
    });

    test("retorna 403 se usuario tenta atualizar outro — RN-USR-012", async () => {
      mockUsuarioService.atualizar.mockRejectedValue(
        new CustomError({
          statusCode: 403,
          customMessage: "Você não tem permissão para atualizar este usuário.",
        }),
      );

      const res = await request(appUsuario)
        .put(`/usuario/${testIds.usuario}`)
        .send({ nome: "Novo Nome" });

      expect(res.statusCode).toBe(403);
    });
  });

  describe("DELETE /usuario/:id — excluir", () => {
    test("retorna 204 ao excluir conta — RF-020", async () => {
      mockUsuarioService.excluir.mockResolvedValue({
        message: "Conta excluída com sucesso.",
      });

      const res = await request(appUsuario)
        .delete(`/usuario/${testIds.usuario}`)
        .send({ senha: "Teste@123" });

      expect(res.statusCode).toBe(204);
    });

    test("retorna 401 se senha incorreta — RN-USR-018", async () => {
      mockUsuarioService.excluir.mockRejectedValue(
        new CustomError({ statusCode: 401, customMessage: "Senha incorreta." }),
      );

      const res = await request(appUsuario)
        .delete(`/usuario/${testIds.usuario}`)
        .send({ senha: "SenhaErrada" });

      expect(res.statusCode).toBe(401);
    });

    test("retorna 400 se tiver itens em andamento — RN-USR-019", async () => {
      mockUsuarioService.excluir.mockRejectedValue(
        new CustomError({
          statusCode: 400,
          customMessage:
            "Você possui doações em andamento. Finalize-as antes de excluir a conta.",
        }),
      );

      const res = await request(appUsuario)
        .delete(`/usuario/${testIds.usuario}`)
        .send({ senha: "Teste@123" });

      expect(res.statusCode).toBe(400);
    });
  });

  describe("GET /usuario/:id/itens — listar itens", () => {
    test("retorna 200 com itens do usuario — RF-015", async () => {
      mockUsuarioService.listarItens.mockResolvedValue([
        { _id: testIds.item, titulo: "Sofa" },
      ]);

      const res = await request(appUsuario).get(
        `/usuario/${testIds.usuario}/itens`,
      );

      expect(res.statusCode).toBe(200);
      expect(res.body.data).toHaveLength(1);
    });

    test("retorna 404 se usuario nao existe", async () => {
      mockUsuarioService.listarItens.mockRejectedValue(
        new CustomError({
          statusCode: 404,
          customMessage: "Usuário não encontrado.",
        }),
      );

      const res = await request(appUsuario).get(
        `/usuario/${testIds.usuario}/itens`,
      );

      expect(res.statusCode).toBe(404);
    });
  });

  describe("PATCH /usuario/:id/suspender — admin", () => {
    test("retorna 200 ao suspender usuario — RN-USR-025", async () => {
      mockUsuarioService.suspender.mockResolvedValue({
        _id: testIds.usuario,
        situacao: "SUSPENSO",
      });

      const res = await request(appAdmin)
        .patch(`/usuario/${testIds.usuario}/suspender`)
        .send({
          motivo: "Violacao dos termos",
          suspensao_ate: "2026-12-31T00:00:00.000Z",
        });

      expect(res.statusCode).toBe(200);
      expect(res.body.data.situacao).toBe("SUSPENSO");
    });
  });

  describe("PATCH /usuario/:id/reativar — admin", () => {
    test("retorna 200 ao reativar usuario suspenso — RN-USR-026", async () => {
      mockUsuarioService.reativar.mockResolvedValue({
        _id: testIds.usuario,
        situacao: "ATIVO",
      });

      const res = await request(appAdmin).patch(
        `/usuario/${testIds.usuario}/reativar`,
      );

      expect(res.statusCode).toBe(200);
      expect(res.body.data.situacao).toBe("ATIVO");
    });

    test("retorna 400 se usuario nao esta suspenso — RN-USR-026", async () => {
      mockUsuarioService.reativar.mockRejectedValue(
        new CustomError({
          statusCode: 400,
          customMessage: "Apenas usuários suspensos podem ser reativados.",
        }),
      );

      const res = await request(appAdmin).patch(
        `/usuario/${testIds.usuario}/reativar`,
      );

      expect(res.statusCode).toBe(400);
    });
  });
});
