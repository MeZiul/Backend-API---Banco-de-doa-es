import { beforeEach, describe, expect, jest, test } from "@jest/globals";
import AutenticacaoService from "../../services/AutenticacaoService.js";

const fixedNow = new Date("2026-08-25T18:00:00.000Z");

const createApiError = (code, statusCode = 400) => {
  const error = new Error(code);
  error.name = "APIError";
  error.statusCode = statusCode;
  error.body = { code };
  return error;
};

describe("AutenticacaoService", () => {
  let api;
  let auth;
  let usuarioRepository;
  let prisma;
  let passwordHelper;
  let transactionRunner;
  let service;

  beforeEach(() => {
    api = {
      signUpEmail: jest.fn(),
      signInEmail: jest.fn(),
      requestPasswordReset: jest.fn(),
      resetPassword: jest.fn(),
      signOut: jest.fn(),
    };
    auth = { api };
    usuarioRepository = { buscarPorId: jest.fn() };
    prisma = {
      session: {
        deleteMany: jest.fn(),
        updateMany: jest.fn(),
      },
      account: {
        findFirst: jest.fn(),
        updateMany: jest.fn(),
      },
    };
    passwordHelper = {
      comparePassword: jest.fn(),
      hashPassword: jest.fn(),
    };
    transactionRunner = jest.fn((operation) => operation(prisma));

    service = new AutenticacaoService({
      auth,
      usuarioRepository,
      prismaProvider: () => prisma,
      transactionRunner,
      passwordHelper,
      tokenFactory: () => "novo-token-seguro",
      clock: () => fixedNow,
      sessionExpiresInSeconds: 60,
    });
  });

  test("cadastra Usuario e Account pelo Better Auth", async () => {
    api.signUpEmail.mockResolvedValue({ user: { id: "usuario-1" } });
    const dados = {
      nome: "Maria",
      email: "maria@doai.local",
      senha: "Senha@123",
      cpf: "123.456.789-09",
      telefone: "69999999999",
      cidade: "Vilhena",
      uf: "RO",
      bio: "Doadora",
    };

    await expect(service.cadastrar(dados)).resolves.toEqual({ id: "usuario-1" });
    expect(api.signUpEmail).toHaveBeenCalledWith({
      body: {
        name: dados.nome,
        email: dados.email,
        password: dados.senha,
        cpf: dados.cpf,
        telefone: dados.telefone,
        cidade: dados.cidade,
        uf: dados.uf,
        bio: dados.bio,
      },
    });
  });

  test("converte conflito de cadastro do Better Auth para resposta 409", async () => {
    api.signUpEmail.mockRejectedValue(
      createApiError("USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL", 422),
    );

    await expect(service.cadastrar({})).rejects.toMatchObject({
      statusCode: 409,
      customMessage: "E-mail já cadastrado. Faça login ou recupere sua senha.",
    });
  });

  test("faz login e retorna token de sessao para usuario ativo", async () => {
    api.signInEmail.mockResolvedValue({
      token: "session-token",
      user: { id: "usuario-1" },
    });
    usuarioRepository.buscarPorId.mockResolvedValue({
      _id: "usuario-1",
      nome: "Maria",
      situacao: "ATIVO",
      toObject: () => ({ id: "usuario-1", nome: "Maria", situacao: "ATIVO" }),
    });

    await expect(
      service.login("maria@doai.local", "Senha@123", {
        "user-agent": "Jest",
      }),
    ).resolves.toEqual({
      token: "session-token",
      usuario: { id: "usuario-1", nome: "Maria", situacao: "ATIVO" },
    });
    expect(api.signInEmail.mock.calls[0][0].headers).toBeInstanceOf(Headers);
  });

  test("remove a sessao criada e bloqueia login de usuario suspenso", async () => {
    api.signInEmail.mockResolvedValue({
      token: "session-token",
      user: { id: "usuario-1" },
    });
    usuarioRepository.buscarPorId.mockResolvedValue({
      _id: "usuario-1",
      situacao: "SUSPENSO",
      suspensao_ate: new Date("2026-09-01T00:00:00.000Z"),
      motivo_suspensao: "Violacao dos termos",
    });

    await expect(
      service.login("maria@doai.local", "Senha@123"),
    ).rejects.toMatchObject({ statusCode: 403 });
    expect(prisma.session.deleteMany).toHaveBeenCalledWith({
      where: { token: "session-token" },
    });
  });

  test("remove a sessao quando a identidade nao possui usuario de dominio", async () => {
    api.signInEmail.mockResolvedValue({
      token: "session-token",
      user: { id: "usuario-ausente" },
    });
    usuarioRepository.buscarPorId.mockResolvedValue(null);

    await expect(
      service.login("ausente@doai.local", "Senha@123"),
    ).rejects.toMatchObject({
      statusCode: 401,
      customMessage: "Usuário não encontrado.",
    });
    expect(prisma.session.deleteMany).toHaveBeenCalledWith({
      where: { token: "session-token" },
    });
  });

  test("remove a sessao e bloqueia login de conta inativa", async () => {
    api.signInEmail.mockResolvedValue({
      token: "session-token",
      user: { id: "usuario-1" },
    });
    usuarioRepository.buscarPorId.mockResolvedValue({
      _id: "usuario-1",
      situacao: "INATIVO",
    });

    await expect(
      service.login("inativo@doai.local", "Senha@123"),
    ).rejects.toMatchObject({
      statusCode: 403,
      customMessage: "Conta inativa.",
    });
  });

  test("converte credenciais invalidas em erro operacional", async () => {
    api.signInEmail.mockRejectedValue(
      createApiError("INVALID_EMAIL_OR_PASSWORD", 401),
    );

    await expect(
      service.login("maria@doai.local", "incorreta"),
    ).rejects.toMatchObject({
      statusCode: 401,
      customMessage: "E-mail ou senha incorretos.",
    });
  });

  test("inicia recuperacao sem revelar se o e-mail existe", async () => {
    api.requestPasswordReset.mockResolvedValue({ status: true });

    await expect(service.esqueciSenha("maria@doai.local")).resolves.toEqual({
      message: "Se o e-mail estiver cadastrado, voce recebera as instrucoes.",
    });
    expect(api.requestPasswordReset).toHaveBeenCalledWith({
      body: { email: "maria@doai.local" },
    });
  });

  test("mapeia falha operacional ao iniciar recuperacao", async () => {
    api.requestPasswordReset.mockRejectedValue(
      createApiError("RATE_LIMITED", 429),
    );

    await expect(service.esqueciSenha("maria@doai.local")).rejects.toMatchObject({
      statusCode: 429,
      customMessage: "Não foi possível iniciar a recuperação de senha.",
    });
  });

  test("redefine senha usando o token de verificacao do Better Auth", async () => {
    api.resetPassword.mockResolvedValue({ status: true });

    await expect(
      service.redefinirSenha("reset-token", "NovaSenha@123"),
    ).resolves.toEqual({ message: "Senha redefinida com sucesso." });
    expect(api.resetPassword).toHaveBeenCalledWith({
      body: { token: "reset-token", newPassword: "NovaSenha@123" },
    });
  });

  test("mapeia token de recuperacao invalido", async () => {
    api.resetPassword.mockRejectedValue(createApiError("INVALID_TOKEN", 400));

    await expect(
      service.redefinirSenha("token-invalido", "NovaSenha@123"),
    ).rejects.toMatchObject({
      statusCode: 400,
      customMessage: "Token inválido ou expirado.",
    });
  });

  test("encerra a sessao autenticada pelo Better Auth", async () => {
    api.signOut.mockResolvedValue({ success: true });

    await expect(
      service.logout({ authorization: "Bearer session-token" }),
    ).resolves.toEqual({ message: "Logout realizado com sucesso." });
    expect(api.signOut.mock.calls[0][0].headers).toBeInstanceOf(Headers);
  });

  test("preserva falha inesperada de logout para o error handler", async () => {
    const unexpectedError = new Error("falha de infraestrutura");
    api.signOut.mockRejectedValue(unexpectedError);

    await expect(service.logout()).rejects.toBe(unexpectedError);
  });

  test("rotaciona atomicamente uma sessao valida", async () => {
    prisma.session.updateMany.mockResolvedValue({ count: 1 });

    await expect(
      service.refreshToken({
        sessionToken: "token-atual",
        usuarioId: "usuario-1",
      }),
    ).resolves.toBe("novo-token-seguro");
    expect(prisma.session.updateMany).toHaveBeenCalledWith({
      where: {
        token: "token-atual",
        userId: "usuario-1",
        expiresAt: { gt: fixedNow },
      },
      data: {
        token: "novo-token-seguro",
        expiresAt: new Date("2026-08-25T18:01:00.000Z"),
      },
    });
  });

  test("rejeita rotacao concorrente ou sessao expirada", async () => {
    prisma.session.updateMany.mockResolvedValue({ count: 0 });

    await expect(
      service.refreshToken({
        sessionToken: "token-antigo",
        usuarioId: "usuario-1",
      }),
    ).rejects.toMatchObject({ statusCode: 401 });
  });

  test("rejeita rotacao sem identidade autenticada", async () => {
    await expect(
      service.refreshToken({ sessionToken: null, usuarioId: "usuario-1" }),
    ).rejects.toMatchObject({
      statusCode: 401,
      customMessage: "Sessão autenticada não informada.",
    });
    expect(prisma.session.updateMany).not.toHaveBeenCalled();
  });

  test("verifica a senha na Account credential", async () => {
    prisma.account.findFirst.mockResolvedValue({ password: "hash" });
    passwordHelper.comparePassword.mockResolvedValue(true);

    await expect(
      service.verificarSenhaUsuario("usuario-1", "Senha@123"),
    ).resolves.toBe(true);
    expect(prisma.account.findFirst).toHaveBeenCalledWith({
      where: {
        userId: "usuario-1",
        providerId: "credential",
        issuer: "local:credential",
      },
      select: { password: true },
    });
  });

  test("retorna falso quando a Account nao possui senha local", async () => {
    prisma.account.findFirst.mockResolvedValue(null);

    await expect(
      service.verificarSenhaUsuario("usuario-1", "Senha@123"),
    ).resolves.toBe(false);
    expect(passwordHelper.comparePassword).not.toHaveBeenCalled();
  });

  test("atualiza a credencial e revoga todas as sessoes na mesma transacao", async () => {
    passwordHelper.hashPassword.mockResolvedValue("novo-hash");
    prisma.account.updateMany.mockResolvedValue({ count: 1 });

    await expect(
      service.atualizarSenhaUsuario("usuario-1", "NovaSenha@123"),
    ).resolves.toBe(true);
    expect(transactionRunner).toHaveBeenCalledTimes(1);
    expect(prisma.account.updateMany).toHaveBeenCalledWith({
      where: {
        userId: "usuario-1",
        providerId: "credential",
        issuer: "local:credential",
      },
      data: { password: "novo-hash" },
    });
    expect(prisma.session.deleteMany).toHaveBeenCalledWith({
      where: { userId: "usuario-1" },
    });
  });

  test("falha se a credencial de senha nao existir", async () => {
    passwordHelper.hashPassword.mockResolvedValue("novo-hash");
    prisma.account.updateMany.mockResolvedValue({ count: 0 });

    await expect(
      service.atualizarSenhaUsuario("usuario-1", "NovaSenha@123"),
    ).rejects.toMatchObject({ statusCode: 404 });
    expect(prisma.session.deleteMany).not.toHaveBeenCalled();
  });

  test("permite atualizar a credencial sem revogar sessoes quando solicitado", async () => {
    passwordHelper.hashPassword.mockResolvedValue("novo-hash");
    prisma.account.updateMany.mockResolvedValue({ count: 1 });

    await expect(
      service.atualizarSenhaUsuario("usuario-1", "NovaSenha@123", {
        revogarSessoes: false,
      }),
    ).resolves.toBe(true);
    expect(prisma.session.deleteMany).not.toHaveBeenCalled();
  });

  test("revoga todas as sessoes persistidas do usuario", async () => {
    await service.revogarSessoesUsuario("usuario-1");

    expect(prisma.session.deleteMany).toHaveBeenCalledWith({
      where: { userId: "usuario-1" },
    });
  });
});
