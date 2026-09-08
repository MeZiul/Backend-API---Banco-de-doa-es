import { describe, expect, jest, test } from "@jest/globals";
import { createAuthMiddleware } from "../../middlewares/createAuthMiddleware.js";

const executeMiddleware = async (middleware, req = { headers: {} }) => {
  let nextValue;
  await middleware(req, {}, (value) => {
    nextValue = value;
  });
  return { req, nextValue };
};

describe("AuthMiddleware com Better Auth", () => {
  test("rejeita requisicao sem sessao valida", async () => {
    const middleware = createAuthMiddleware({
      authClient: { api: { getSession: jest.fn().mockResolvedValue(null) } },
      usuarioRepository: { buscarPorId: jest.fn() },
    });

    const { nextValue } = await executeMiddleware(middleware);

    expect(nextValue).toMatchObject({
      name: "AuthenticationError",
      statusCode: 498,
    });
  });

  test("carrega o estado atual do usuario e preserva o contrato req.user", async () => {
    const getSession = jest.fn().mockResolvedValue({
      session: { token: "session-token", userId: "usuario-1" },
      user: { id: "usuario-1" },
    });
    const buscarPorId = jest.fn().mockResolvedValue({
      _id: "usuario-1",
      nome: "Maria",
      email: "maria@doai.local",
      perfil: "USUARIO",
      situacao: "ATIVO",
    });
    const middleware = createAuthMiddleware({
      authClient: { api: { getSession } },
      usuarioRepository: { buscarPorId },
    });
    const req = {
      headers: { authorization: "Bearer session-token" },
    };

    const result = await executeMiddleware(middleware, req);

    expect(result.nextValue).toBeUndefined();
    expect(result.req.auth.session.token).toBe("session-token");
    expect(result.req.user).toEqual({
      id: "usuario-1",
      nome: "Maria",
      email: "maria@doai.local",
      perfil: "USUARIO",
      papeis: ["USUARIO"],
      instituicaoId: null,
      situacao: "ATIVO",
    });
    expect(buscarPorId).toHaveBeenCalledWith("usuario-1");
    expect(getSession.mock.calls[0][0].headers).toBeInstanceOf(Headers);
  });

  test("bloqueia sessao de usuario que foi suspenso depois do login", async () => {
    const middleware = createAuthMiddleware({
      authClient: {
        api: {
          getSession: jest.fn().mockResolvedValue({
            session: { token: "session-token" },
            user: { id: "usuario-1" },
          }),
        },
      },
      usuarioRepository: {
        buscarPorId: jest.fn().mockResolvedValue({
          _id: "usuario-1",
          situacao: "SUSPENSO",
        }),
      },
    });

    const { nextValue } = await executeMiddleware(middleware);

    expect(nextValue).toMatchObject({
      statusCode: 403,
      customMessage: "Somente usuários ativos podem realizar operações protegidas.",
    });
  });

  test("permite logout de conta inativa quando requireActive e falso", async () => {
    const middleware = createAuthMiddleware({
      authClient: {
        api: {
          getSession: jest.fn().mockResolvedValue({
            session: { token: "session-token" },
            user: { id: "usuario-1" },
          }),
        },
      },
      usuarioRepository: {
        buscarPorId: jest.fn().mockResolvedValue({
          _id: "usuario-1",
          perfil: "USUARIO",
          situacao: "INATIVO",
        }),
      },
      requireActive: false,
    });

    const result = await executeMiddleware(middleware);

    expect(result.nextValue).toBeUndefined();
    expect(result.req.user.situacao).toBe("INATIVO");
  });
});
