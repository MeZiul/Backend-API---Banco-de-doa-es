import { beforeEach, describe, expect, jest, test } from "@jest/globals";
import bcrypt from "bcryptjs";
import UsuarioService from "../../services/UsuarioService.js";
import CustomError from "../../utils/helpers/CustomError.js";

jest.mock("bcryptjs");

const mockUsuarioRepository = {
  buscarPorEmail: jest.fn(),
  buscarPorCpf: jest.fn(),
  buscarPorEmailComSenha: jest.fn(),
  buscarPorId: jest.fn(),
  buscarPorTokenRedefinicao: jest.fn(),
  criar: jest.fn(),
  atualizar: jest.fn(),
  atualizarSenha: jest.fn(),
  listar: jest.fn(),
};

const mockItemDoacaoRepository = {
  buscarEmAndamentoPorUsuario: jest.fn(),
  cancelarItensPorUsuario: jest.fn(),
  listarPorUsuario: jest.fn(),
};

const mockAvaliacaoRepository = {
  listar: jest.fn(),
};

const mockMailService = {
  enviarLinkRecuperacao: jest.fn(),
};

let service;

beforeEach(() => {
  Object.values(mockUsuarioRepository).forEach((fn) => fn.mockReset());
  Object.values(mockItemDoacaoRepository).forEach((fn) => fn.mockReset());
  Object.values(mockAvaliacaoRepository).forEach((fn) => fn.mockReset());
  mockMailService.enviarLinkRecuperacao.mockReset();

  bcrypt.compare.mockReset();
  bcrypt.hash.mockReset();
  // padrao: hash retorna um valor "fake" diferente da senha original
  bcrypt.hash.mockResolvedValue("$2b$10$hashfake");

  service = new UsuarioService({
    usuarioRepository: mockUsuarioRepository,
    itemDoacaoRepository: mockItemDoacaoRepository,
    avaliacaoRepository: mockAvaliacaoRepository,
    mailService: mockMailService,
  });
});

describe("UsuarioService.cadastrar", () => {
  test("deve cadastrar usuario com sucesso — RF-001", async () => {
    mockUsuarioRepository.buscarPorEmail.mockResolvedValue(null);
    mockUsuarioRepository.buscarPorCpf.mockResolvedValue(null);
    mockUsuarioRepository.criar.mockResolvedValue({
      _id: "507f1f77bcf86cd799439012",
      nome: "Teste Silva",
      email: "teste@email.com",
      perfil: "USUARIO",
      situacao: "ATIVO",
    });

    const resultado = await service.cadastrar({
      nome: "Teste Silva",
      email: "teste@email.com",
      cpf: "123.456.789-09",
      senha: "Teste@123",
      cidade: "Porto Velho",
      uf: "RO",
    });

    expect(resultado.perfil).toBe("USUARIO");
    expect(resultado.situacao).toBe("ATIVO");
    expect(mockUsuarioRepository.criar).toHaveBeenCalledTimes(1);
  });

  test("deve hashear a senha antes de salvar — RN-USR-004", async () => {
    mockUsuarioRepository.buscarPorEmail.mockResolvedValue(null);
    mockUsuarioRepository.buscarPorCpf.mockResolvedValue(null);
    mockUsuarioRepository.criar.mockResolvedValue({ _id: "1" });

    await service.cadastrar({
      nome: "Teste",
      email: "teste@email.com",
      cpf: "123.456.789-09",
      senha: "Teste@123",
      cidade: "Porto Velho",
      uf: "RO",
    });

    const dadosSalvos = mockUsuarioRepository.criar.mock.calls[0][0];
    expect(bcrypt.hash).toHaveBeenCalledWith("Teste@123", 10);
    expect(dadosSalvos.senha).not.toBe("Teste@123");
    expect(dadosSalvos.perfil).toBe("USUARIO");
    expect(dadosSalvos.situacao).toBe("ATIVO");
  });

  test("deve lancar 409 se email ja cadastrado — RN-USR-006", async () => {
    mockUsuarioRepository.buscarPorEmail.mockResolvedValue({ _id: "123" });

    await expect(
      service.cadastrar({
        email: "existente@email.com",
        cpf: "111",
        senha: "Teste@123",
      }),
    ).rejects.toMatchObject({ statusCode: 409 });

    expect(mockUsuarioRepository.criar).not.toHaveBeenCalled();
  });

  test("deve lancar 409 se CPF ja cadastrado — RN-USR-007", async () => {
    mockUsuarioRepository.buscarPorEmail.mockResolvedValue(null);
    mockUsuarioRepository.buscarPorCpf.mockResolvedValue({ _id: "123" });

    await expect(
      service.cadastrar({
        email: "novo@email.com",
        cpf: "123.456.789-09",
        senha: "Teste@123",
      }),
    ).rejects.toMatchObject({ statusCode: 409 });

    expect(mockUsuarioRepository.criar).not.toHaveBeenCalled();
  });
});

describe("UsuarioService.login", () => {
  const usuarioMock = {
    _id: "507f1f77bcf86cd799439012",
    nome: "Teste Silva",
    email: "teste@email.com",
    perfil: "USUARIO",
    situacao: "ATIVO",
    senha: "$2b$10$hashedpassword",
    token_redefinicao: "token-que-nao-pode-vazar",
    token_redefinicao_expira: new Date("2026-12-31T23:59:59.000Z"),
    toObject: () => ({
      _id: "507f1f77bcf86cd799439012",
      nome: "Teste Silva",
      email: "teste@email.com",
      perfil: "USUARIO",
      situacao: "ATIVO",
      senha: "$2b$10$hashedpassword",
      token_redefinicao: "token-que-nao-pode-vazar",
      token_redefinicao_expira: new Date("2026-12-31T23:59:59.000Z"),
    }),
  };

  test("deve retornar tokens de autenticação sem credenciais internas do usuário — RF-002", async () => {
    mockUsuarioRepository.buscarPorEmailComSenha.mockResolvedValue(usuarioMock);
    bcrypt.compare.mockResolvedValue(true);

    const resultado = await service.login("teste@email.com", "Teste@123");

    expect(resultado.token).toBeDefined();
    expect(resultado.refreshToken).toBeDefined();
    expect(resultado.usuario.senha).toBeUndefined();
    expect(resultado.usuario.token_redefinicao).toBeUndefined();
    expect(resultado.usuario.token_redefinicao_expira).toBeUndefined();
  });

  test("deve lancar 401 se usuario nao encontrado — RN-USR-009", async () => {
    mockUsuarioRepository.buscarPorEmailComSenha.mockResolvedValue(null);

    await expect(
      service.login("naoexiste@email.com", "qualquer"),
    ).rejects.toMatchObject({ statusCode: 401 });
  });

  test("deve lancar 401 se senha incorreta — RN-USR-009", async () => {
    mockUsuarioRepository.buscarPorEmailComSenha.mockResolvedValue(usuarioMock);
    bcrypt.compare.mockResolvedValue(false);

    await expect(
      service.login("teste@email.com", "SenhaErrada"),
    ).rejects.toMatchObject({ statusCode: 401 });
  });

  test("deve lancar 403 se conta suspensa — RN-USR-010", async () => {
    mockUsuarioRepository.buscarPorEmailComSenha.mockResolvedValue({
      ...usuarioMock,
      situacao: "SUSPENSO",
      suspensao_ate: new Date(),
      motivo_suspensao: "Teste",
    });
    bcrypt.compare.mockResolvedValue(true);

    await expect(
      service.login("teste@email.com", "Teste@123"),
    ).rejects.toMatchObject({ statusCode: 403 });
  });

  test("deve lancar 403 se conta inativa — RN-USR-010", async () => {
    mockUsuarioRepository.buscarPorEmailComSenha.mockResolvedValue({
      ...usuarioMock,
      situacao: "INATIVO",
    });
    bcrypt.compare.mockResolvedValue(true);

    await expect(
      service.login("teste@email.com", "Teste@123"),
    ).rejects.toMatchObject({ statusCode: 403 });
  });
});

describe("UsuarioService.esqueciSenha", () => {
  test("deve enviar o token sem retorná-lo na resposta", async () => {
    mockUsuarioRepository.buscarPorEmail.mockResolvedValue({
      _id: "507f1f77bcf86cd799439012",
      email: "teste@email.com",
    });
    mockUsuarioRepository.atualizar.mockResolvedValue({});

    const resultado = await service.esqueciSenha("teste@email.com");

    expect(resultado).toEqual({
      message: "Se o e-mail estiver cadastrado, voce recebera as instrucoes.",
    });
    expect(resultado.token).toBeUndefined();
    expect(mockUsuarioRepository.atualizar).toHaveBeenCalledTimes(1);
    expect(mockUsuarioRepository.atualizar.mock.calls[0][1].token_redefinicao).toMatch(/^[a-f0-9]{64}$/);
    expect(mockMailService.enviarLinkRecuperacao).toHaveBeenCalledWith({
      email: "teste@email.com",
      token: expect.stringMatching(/^[a-f0-9]{64}$/),
    });
  });

  test("nao deve revelar se o email existe (anti-enumeracao)", async () => {
    mockUsuarioRepository.buscarPorEmail.mockResolvedValue(null);

    const resultado = await service.esqueciSenha("naoexiste@email.com");

    // mesma mensagem generica, sem token, sem chamar atualizar
    expect(resultado.message).toBe(
      "Se o e-mail estiver cadastrado, voce recebera as instrucoes.",
    );
    expect(resultado.token).toBeUndefined();
    expect(mockUsuarioRepository.atualizar).not.toHaveBeenCalled();
  });
});

describe("UsuarioService.refreshToken", () => {
  test("deve gerar novo token para usuario ativo", async () => {
    mockUsuarioRepository.buscarPorId.mockResolvedValue({
      _id: "507f1f77bcf86cd799439012",
      situacao: "ATIVO",
    });

    const novoToken = await service.refreshToken({
      id: "507f1f77bcf86cd799439012",
      nome: "Teste",
      email: "teste@email.com",
      perfil: "USUARIO",
    });

    expect(novoToken).toBeDefined();
    expect(typeof novoToken).toBe("string");
  });

  test("deve lancar 401 se usuario nao existe", async () => {
    mockUsuarioRepository.buscarPorId.mockResolvedValue(null);

    await expect(
      service.refreshToken({ id: "inexistente" }),
    ).rejects.toMatchObject({ statusCode: 401 });
  });

  test("deve lancar 403 se conta nao esta ativa", async () => {
    mockUsuarioRepository.buscarPorId.mockResolvedValue({
      _id: "123",
      situacao: "SUSPENSO",
    });

    await expect(
      service.refreshToken({ id: "123" }),
    ).rejects.toMatchObject({ statusCode: 403 });
  });
});

describe("UsuarioService.redefinirSenha", () => {
  test("deve redefinir a senha com token valido", async () => {
    mockUsuarioRepository.buscarPorTokenRedefinicao.mockResolvedValue({
      _id: "507f1f77bcf86cd799439012",
      token_redefinicao_expira: new Date(Date.now() + 60 * 60 * 1000),
    });
    mockUsuarioRepository.atualizarSenha.mockResolvedValue({});

    const resultado = await service.redefinirSenha("token-valido", "NovaSenha@123");

    expect(resultado.message).toBe("Senha redefinida com sucesso.");
    expect(bcrypt.hash).toHaveBeenCalledWith("NovaSenha@123", 10);
    expect(mockUsuarioRepository.atualizarSenha).toHaveBeenCalledTimes(1);
  });

  test("deve lancar 400 se token invalido", async () => {
    mockUsuarioRepository.buscarPorTokenRedefinicao.mockResolvedValue(null);

    await expect(
      service.redefinirSenha("token-invalido", "NovaSenha@123"),
    ).rejects.toMatchObject({ statusCode: 400 });
  });

  test("deve lancar 400 se token expirado", async () => {
    mockUsuarioRepository.buscarPorTokenRedefinicao.mockResolvedValue({
      _id: "123",
      token_redefinicao_expira: new Date(Date.now() - 1000), // ja expirou
    });

    await expect(
      service.redefinirSenha("token-expirado", "NovaSenha@123"),
    ).rejects.toMatchObject({ statusCode: 400 });
  });
});


describe("UsuarioService.atualizar", () => {
  test("deve atualizar usuario com sucesso — RF-004", async () => {
    const usuario = { _id: "507f1f77bcf86cd799439012", nome: "Antigo" };
    mockUsuarioRepository.buscarPorId.mockResolvedValue(usuario);
    mockUsuarioRepository.buscarPorEmail.mockResolvedValue(null);
    mockUsuarioRepository.atualizar.mockResolvedValue({
      ...usuario,
      nome: "Novo Nome",
    });

    const resultado = await service.atualizar(
      "507f1f77bcf86cd799439012",
      { nome: "Novo Nome" },
      { id: "507f1f77bcf86cd799439012", perfil: "USUARIO" },
    );

    expect(resultado.nome).toBe("Novo Nome");
  });

  test("deve lancar 404 se usuario nao existe", async () => {
    mockUsuarioRepository.buscarPorId.mockResolvedValue(null);

    await expect(
      service.atualizar("inexistente", { nome: "Novo" }, null),
    ).rejects.toMatchObject({ statusCode: 404 });
  });

  test("deve lancar 403 se usuario tenta atualizar outro — RN-USR-012", async () => {
    mockUsuarioRepository.buscarPorId.mockResolvedValue({
      _id: "507f1f77bcf86cd799439012",
    });

    await expect(
      service.atualizar(
        "507f1f77bcf86cd799439012",
        { nome: "Novo" },
        { id: "outro_id", perfil: "USUARIO" },
      ),
    ).rejects.toMatchObject({ statusCode: 403 });
  });

  test("deve lancar 409 se email ja esta em uso por outro usuario", async () => {
    mockUsuarioRepository.buscarPorId.mockResolvedValue({
      _id: "507f1f77bcf86cd799439012",
    });
    mockUsuarioRepository.buscarPorEmail.mockResolvedValue({
      _id: "outro_id_diferente",
    });

    await expect(
      service.atualizar(
        "507f1f77bcf86cd799439012",
        { email: "emuso@email.com" },
        { id: "507f1f77bcf86cd799439012", perfil: "USUARIO" },
      ),
    ).rejects.toMatchObject({ statusCode: 409 });
  });

  test("campos sensiveis (cpf, perfil, situacao, senha) nao devem ser alterados — RN-USR-013", async () => {
    mockUsuarioRepository.buscarPorId.mockResolvedValue({
      _id: "507f1f77bcf86cd799439012",
    });
    mockUsuarioRepository.buscarPorEmail.mockResolvedValue(null);
    mockUsuarioRepository.atualizar.mockResolvedValue({
      _id: "507f1f77bcf86cd799439012",
    });

    await service.atualizar(
      "507f1f77bcf86cd799439012",
      {
        cpf: "999.999.999-99",
        perfil: "ADMINISTRADOR",
        situacao: "ATIVO",
        senha: "tentativa",
        nome: "Teste",
      },
      { id: "507f1f77bcf86cd799439012", perfil: "USUARIO" },
    );

    const chamada = mockUsuarioRepository.atualizar.mock.calls[0][1];
    expect(chamada.cpf).toBeUndefined();
    expect(chamada.perfil).toBeUndefined();
    expect(chamada.situacao).toBeUndefined();
    expect(chamada.senha).toBeUndefined();
    expect(chamada.nome).toBe("Teste");
  });
});

describe("UsuarioService.excluir", () => {
  const usuario = {
    _id: "507f1f77bcf86cd799439012",
    email: "teste@email.com",
    senha: "$2b$10$hash",
  };

  test("deve excluir usuario com sucesso (soft delete) — RF-020", async () => {
    mockUsuarioRepository.buscarPorId.mockResolvedValue(usuario);
    mockUsuarioRepository.buscarPorEmailComSenha.mockResolvedValue(usuario);
    mockItemDoacaoRepository.buscarEmAndamentoPorUsuario.mockResolvedValue([]);
    mockUsuarioRepository.atualizar.mockResolvedValue({});
    mockItemDoacaoRepository.cancelarItensPorUsuario.mockResolvedValue({});
    bcrypt.compare.mockResolvedValue(true);

    const resultado = await service.excluir(
      "507f1f77bcf86cd799439012",
      "Teste@123",
    );

    expect(resultado.message).toBe("Conta excluída com sucesso.");
  });

  test("deve anonimizar os dados e cancelar itens ao excluir", async () => {
    mockUsuarioRepository.buscarPorId.mockResolvedValue(usuario);
    mockUsuarioRepository.buscarPorEmailComSenha.mockResolvedValue(usuario);
    mockItemDoacaoRepository.buscarEmAndamentoPorUsuario.mockResolvedValue([]);
    mockUsuarioRepository.atualizar.mockResolvedValue({});
    mockItemDoacaoRepository.cancelarItensPorUsuario.mockResolvedValue({});
    bcrypt.compare.mockResolvedValue(true);

    await service.excluir("507f1f77bcf86cd799439012", "Teste@123");

    const dadosAnonimizados = mockUsuarioRepository.atualizar.mock.calls[0][1];
    expect(dadosAnonimizados.situacao).toBe("INATIVO");
    expect(dadosAnonimizados.nome).toBe("Usuário Removido");
    expect(dadosAnonimizados.telefone).toBeNull();
    expect(mockItemDoacaoRepository.cancelarItensPorUsuario).toHaveBeenCalledWith(
      "507f1f77bcf86cd799439012",
    );
  });

  test("deve lancar 401 se senha incorreta — RN-USR-018", async () => {
    mockUsuarioRepository.buscarPorId.mockResolvedValue(usuario);
    mockUsuarioRepository.buscarPorEmailComSenha.mockResolvedValue(usuario);
    bcrypt.compare.mockResolvedValue(false);

    await expect(
      service.excluir("507f1f77bcf86cd799439012", "SenhaErrada"),
    ).rejects.toMatchObject({ statusCode: 401 });
  });

  test("deve lancar 400 se tiver itens em andamento — RN-USR-019", async () => {
    mockUsuarioRepository.buscarPorId.mockResolvedValue(usuario);
    mockUsuarioRepository.buscarPorEmailComSenha.mockResolvedValue(usuario);
    mockItemDoacaoRepository.buscarEmAndamentoPorUsuario.mockResolvedValue([
      { _id: "item1" },
    ]);
    bcrypt.compare.mockResolvedValue(true);

    await expect(
      service.excluir("507f1f77bcf86cd799439012", "Teste@123"),
    ).rejects.toMatchObject({ statusCode: 400 });
  });
});

describe("UsuarioService.suspender", () => {
  test("deve suspender usuario com sucesso — RN-USR-025", async () => {
    mockUsuarioRepository.buscarPorId.mockResolvedValue({
      _id: "123",
      situacao: "ATIVO",
    });
    mockUsuarioRepository.atualizar.mockResolvedValue({ situacao: "SUSPENSO" });

    const resultado = await service.suspender("123", {
      motivo: "Violacao dos termos",
      suspensao_ate: "2026-12-31",
    });

    expect(resultado.situacao).toBe("SUSPENSO");
  });

  test("deve lancar 400 se conta inativa — RN-USR-025", async () => {
    mockUsuarioRepository.buscarPorId.mockResolvedValue({
      _id: "123",
      situacao: "INATIVO",
    });

    await expect(
      service.suspender("123", {
        motivo: "Teste",
        suspensao_ate: "2026-12-31",
      }),
    ).rejects.toMatchObject({ statusCode: 400 });
  });

  test("deve lancar 400 se faltar motivo ou data", async () => {
    mockUsuarioRepository.buscarPorId.mockResolvedValue({
      _id: "123",
      situacao: "ATIVO",
    });

    await expect(
      service.suspender("123", { motivo: "", suspensao_ate: "" }),
    ).rejects.toMatchObject({ statusCode: 400 });
  });
});

describe("UsuarioService.reativar", () => {
  test("deve reativar usuario suspenso — RN-USR-026", async () => {
    mockUsuarioRepository.buscarPorId.mockResolvedValue({
      _id: "123",
      situacao: "SUSPENSO",
    });
    mockUsuarioRepository.atualizar.mockResolvedValue({ situacao: "ATIVO" });

    const resultado = await service.reativar("123");
    expect(resultado.situacao).toBe("ATIVO");
  });

  test("deve lancar 400 se usuario nao esta suspenso — RN-USR-026", async () => {
    mockUsuarioRepository.buscarPorId.mockResolvedValue({
      _id: "123",
      situacao: "ATIVO",
    });

    await expect(service.reativar("123")).rejects.toMatchObject({
      statusCode: 400,
    });
  });
});

describe("UsuarioService.listar", () => {
  const usuarioCompleto = {
    _id: "507f1f77bcf86cd799439012",
    nome: "Teste",
    cpf: "123.456.789-09",
    email: "teste@email.com",
    foto_perfil: null,
    bio: null,
    cidade: "Porto Velho",
    uf: "RO",
    situacao: "ATIVO",
    media_avaliacoes: 0,
    total_avaliacoes: 0,
    total_doacoes: 0,
    data_cadastro: new Date(),
  };

  test("admin deve ver os dados completos", async () => {
    mockUsuarioRepository.listar.mockResolvedValue({
      docs: [usuarioCompleto],
      totalDocs: 1,
    });

    const resultado = await service.listar({
      filtros: {},
      page: 1,
      limit: 10,
      actor: { perfil: "ADMINISTRADOR" },
    });

    // admin recebe o doc original (inclui cpf/email)
    expect(resultado.docs[0].cpf).toBe("123.456.789-09");
  });

  test("usuario comum deve receber campos limitados (sem cpf/email)", async () => {
    mockUsuarioRepository.listar.mockResolvedValue({
      docs: [usuarioCompleto],
      totalDocs: 1,
    });

    const resultado = await service.listar({
      filtros: {},
      page: 1,
      limit: 10,
      actor: { perfil: "USUARIO" },
    });

    expect(resultado.docs[0].cpf).toBeUndefined();
    expect(resultado.docs[0].email).toBeUndefined();
    expect(resultado.docs[0].nome).toBe("Teste");
  });
});

describe("UsuarioService.buscarPorId", () => {
  const usuarioCompleto = {
    _id: "507f1f77bcf86cd799439012",
    nome: "Teste",
    cpf: "123.456.789-09",
    email: "teste@email.com",
    foto_perfil: null,
    bio: null,
    cidade: "Porto Velho",
    uf: "RO",
    situacao: "ATIVO",
    media_avaliacoes: 0,
    total_avaliacoes: 0,
    total_doacoes: 0,
    data_cadastro: new Date(),
  };

  test("admin ve os dados completos", async () => {
    mockUsuarioRepository.buscarPorId.mockResolvedValue(usuarioCompleto);

    const resultado = await service.buscarPorId("507f1f77bcf86cd799439012", {
      perfil: "ADMINISTRADOR",
    });

    expect(resultado.cpf).toBe("123.456.789-09");
  });

  test("o proprio usuario ve os dados completos", async () => {
    mockUsuarioRepository.buscarPorId.mockResolvedValue(usuarioCompleto);

    const resultado = await service.buscarPorId("507f1f77bcf86cd799439012", {
      id: "507f1f77bcf86cd799439012",
      perfil: "USUARIO",
    });

    expect(resultado.cpf).toBe("123.456.789-09");
  });

  test("outro usuario recebe campos limitados (sem cpf)", async () => {
    mockUsuarioRepository.buscarPorId.mockResolvedValue(usuarioCompleto);

    const resultado = await service.buscarPorId("507f1f77bcf86cd799439012", {
      id: "outro_id",
      perfil: "USUARIO",
    });

    expect(resultado.cpf).toBeUndefined();
    expect(resultado.email).toBeUndefined();
    expect(resultado.nome).toBe("Teste");
  });

  test("deve lancar 404 se usuario nao existe", async () => {
    mockUsuarioRepository.buscarPorId.mockResolvedValue(null);

    await expect(
      service.buscarPorId("inexistente", null),
    ).rejects.toMatchObject({ statusCode: 404 });
  });
});

describe("UsuarioService.listarItens / listarAvaliacoes", () => {
  test("listarItens deve retornar os itens do usuario", async () => {
    mockUsuarioRepository.buscarPorId.mockResolvedValue({ _id: "123" });
    mockItemDoacaoRepository.listarPorUsuario.mockResolvedValue([
      { _id: "item1", titulo: "Sofa" },
    ]);

    const resultado = await service.listarItens("123");

    expect(resultado).toHaveLength(1);
    expect(mockItemDoacaoRepository.listarPorUsuario).toHaveBeenCalledWith("123");
  });

  test("listarItens deve lancar 404 se usuario nao existe", async () => {
    mockUsuarioRepository.buscarPorId.mockResolvedValue(null);

    await expect(service.listarItens("inexistente")).rejects.toMatchObject({
      statusCode: 404,
    });
  });

  test("listarAvaliacoes deve retornar as avaliacoes do usuario", async () => {
    mockUsuarioRepository.buscarPorId.mockResolvedValue({ _id: "123" });
    mockAvaliacaoRepository.listar.mockResolvedValue({ docs: [] });

    const resultado = await service.listarAvaliacoes("123");

    expect(resultado).toEqual({ docs: [] });
    expect(mockAvaliacaoRepository.listar).toHaveBeenCalledWith({
      filtros: { avaliado_id: "123" },
      page: 1,
      limit: 20,
    });
  });
});
