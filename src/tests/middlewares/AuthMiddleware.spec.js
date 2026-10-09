import { describe, expect, jest, test } from "@jest/globals";
import { createAuthMiddleware } from "../../middlewares/createAuthMiddleware.js";
import ItemDoacaoService from "../../services/ItemDoacaoService.js";
import { itemDoacaoSchema } from "../../utils/validators/schemas/zod/ItemDoacaoSchema.js";

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
      cidade: "Vilhena",
      uf: "RO",
      cpf: "52998224725",
      senha: "nao-deve-ser-propagada",
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
      cidade: "Vilhena",
      uf: "RO",
    });
    expect(buscarPorId).toHaveBeenCalledWith("usuario-1");
    expect(getSession.mock.calls[0][0].headers).toBeInstanceOf(Headers);
  });

  test("usa a localizacao atual do perfil para criar item sem cidade e uf", async () => {
    const middleware = createAuthMiddleware({
      authClient: {
        api: {
          getSession: jest.fn().mockResolvedValue({
            session: { token: "session-token" },
            user: { id: "usuario-1", cidade: "Vilhena", uf: "RO" },
          }),
        },
      },
      usuarioRepository: {
        buscarPorId: jest.fn().mockResolvedValue({
          _id: "usuario-1", situacao: "ATIVO", cidade: "Cuiabá", uf: "MT",
        }),
      },
    });
    const criar = jest.fn().mockImplementation(async (item) => ({ _id: "item-1", ...item }));
    const service = new ItemDoacaoService({ criar });
    const { req, nextValue } = await executeMiddleware(middleware);
    const dados = itemDoacaoSchema.parse({
      titulo: "Livro", descricao: "Livro de programação para doação",
      categoria_id: "categoria-1", condicao_item: "USADO_BOM",
    });

    expect(nextValue).toBeUndefined();
    const item = await service.criar(dados, req.user);

    expect(item).toMatchObject({ cidade: "Cuiabá", uf: "MT", usuario_id: "usuario-1" });
    expect(criar).toHaveBeenCalledWith(expect.objectContaining({ cidade: "Cuiabá", uf: "MT" }));
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
