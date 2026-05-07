import request from "supertest";
import { beforeAll, beforeEach, describe, expect, jest, test } from "@jest/globals";
import { createControllerTestApp, createRegularUser, testIds } from "../test.js";
import { tokenBlacklist } from "../../utils/tokenBlacklist.js";

const mockUsuarioService = {
  login: jest.fn(),
  esqueciSenha: jest.fn(),
  redefinirSenha: jest.fn(),
  refreshToken: jest.fn(),
};

jest.mock("../../containers/services.index.js", () => ({
  usuarioService: mockUsuarioService,
}));

let app;

beforeAll(async () => {
  const { default: AutenticacaoController } = await import("../../controllers/AutenticacaoController.js");
  const controller = new AutenticacaoController();

  app = createControllerTestApp({
    user: createRegularUser({
      id: testIds.usuario,
      nome: "Carlos Silva",
      email: "carlos@email.com",
    }),
    registerRoutes: (testApp) => {
      testApp.post("/auth/login", controller.login);
      testApp.post("/auth/esqueci-senha", controller.esqueciSenha);
      testApp.put("/auth/redefinir-senha", controller.redefinirSenha);
      testApp.post("/auth/logout", controller.logout);
      testApp.post("/auth/refresh-token", controller.refreshToken);
    },
  });
});

beforeEach(() => {
  Object.values(mockUsuarioService).forEach((mockFn) => mockFn.mockReset());
  tokenBlacklist.clear();
});

describe("Testes das Rotas de Autenticação", () => {
  test("Deve realizar login com credenciais válidas", async () => {
    const payload = {
      token: "jwt-token",
      usuario: { _id: testIds.usuario, email: "carlos@email.com" },
    };
    mockUsuarioService.login.mockResolvedValue(payload);

    const res = await request(app)
      .post("/auth/login")
      .send({ email: "carlos@email.com", senha: "Senha@123" });

    expect(res.statusCode).toBe(200);
    expect(res.body.data).toEqual(payload);
    expect(mockUsuarioService.login).toHaveBeenCalledWith("carlos@email.com", "Senha@123");
  });

  test("Deve rejeitar login com payload inválido", async () => {
    const res = await request(app)
      .post("/auth/login")
      .send({ email: "email-invalido", senha: "" });

    expect(res.statusCode).toBe(400);
    expect(mockUsuarioService.login).not.toHaveBeenCalled();
  });

  test("Deve solicitar recuperação de senha", async () => {
    const payload = { message: "Se o e-mail estiver cadastrado, voce recebera as instrucoes." };
    mockUsuarioService.esqueciSenha.mockResolvedValue(payload);

    const res = await request(app)
      .post("/auth/esqueci-senha")
      .send({ email: "carlos@email.com" });

    expect(res.statusCode).toBe(200);
    expect(res.body.data).toEqual(payload);
    expect(mockUsuarioService.esqueciSenha).toHaveBeenCalledWith("carlos@email.com");
  });

  test("Deve redefinir senha com token válido", async () => {
    const payload = { message: "Senha redefinida com sucesso." };
    mockUsuarioService.redefinirSenha.mockResolvedValue(payload);

    const res = await request(app)
      .put("/auth/redefinir-senha")
      .send({ token: "token-recuperacao", novaSenha: "Nova@123" });

    expect(res.statusCode).toBe(200);
    expect(res.body.data).toEqual(payload);
    expect(mockUsuarioService.redefinirSenha).toHaveBeenCalledWith("token-recuperacao", "Nova@123");
  });

  test("Deve renovar token do usuário autenticado", async () => {
    mockUsuarioService.refreshToken.mockResolvedValue("novo-token");

    const res = await request(app).post("/auth/refresh-token");

    expect(res.statusCode).toBe(200);
    expect(res.body.data).toEqual({ token: "novo-token" });
    expect(mockUsuarioService.refreshToken).toHaveBeenCalledWith({
      id: testIds.usuario,
      nome: "Carlos Silva",
      email: "carlos@email.com",
      perfil: "USUARIO",
    });
  });

  test("Deve invalidar token no logout", async () => {
    const res = await request(app)
      .post("/auth/logout")
      .set("Authorization", "Bearer token-antigo");

    expect(res.statusCode).toBe(200);
    expect(tokenBlacklist.has("token-antigo")).toBe(true);
  });
});
