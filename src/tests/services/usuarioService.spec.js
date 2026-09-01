import { beforeEach, describe, expect, jest, test } from "@jest/globals";
import UsuarioService from "../../services/UsuarioService.js";

const mockUsuarioRepository = {
  buscarPorEmail: jest.fn(),
  buscarPorCpf: jest.fn(),
  buscarPorId: jest.fn(),
  atualizar: jest.fn(),
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

const mockAutenticacaoService = {
  cadastrar: jest.fn(),
  verificarSenhaUsuario: jest.fn(),
  atualizarSenhaUsuario: jest.fn(),
  revogarSessoesUsuario: jest.fn(),
};

const mockTransactionManager = {
  run: jest.fn((operation) => operation()),
};

let service;

beforeEach(() => {
  Object.values(mockUsuarioRepository).forEach((fn) => fn.mockReset());
  Object.values(mockItemDoacaoRepository).forEach((fn) => fn.mockReset());
  Object.values(mockAvaliacaoRepository).forEach((fn) => fn.mockReset());
  Object.values(mockAutenticacaoService).forEach((fn) => fn.mockReset());
  mockTransactionManager.run.mockClear();
  mockTransactionManager.run.mockImplementation((operation) => operation());

  service = new UsuarioService({
    usuarioRepository: mockUsuarioRepository,
    itemDoacaoRepository: mockItemDoacaoRepository,
    avaliacaoRepository: mockAvaliacaoRepository,
    autenticacaoService: mockAutenticacaoService,
    transactionManager: mockTransactionManager,
  });
});

describe("UsuarioService.cadastrar", () => {
  test("deve cadastrar usuario com sucesso — RF-001", async () => {
    mockUsuarioRepository.buscarPorEmail.mockResolvedValue(null);
    mockUsuarioRepository.buscarPorCpf.mockResolvedValue(null);
    mockAutenticacaoService.cadastrar.mockResolvedValue({
      id: "507f1f77bcf86cd799439012",
    });
    mockUsuarioRepository.buscarPorId.mockResolvedValue({
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
    expect(mockAutenticacaoService.cadastrar).toHaveBeenCalledTimes(1);
  });

  test("deve delegar a criação da credencial ao Better Auth — RN-USR-004", async () => {
    mockUsuarioRepository.buscarPorEmail.mockResolvedValue(null);
    mockUsuarioRepository.buscarPorCpf.mockResolvedValue(null);
    mockAutenticacaoService.cadastrar.mockResolvedValue({ id: "1" });
    mockUsuarioRepository.buscarPorId.mockResolvedValue({ _id: "1" });

    const dados = {
      nome: "Teste",
      email: "teste@email.com",
      cpf: "123.456.789-09",
      senha: "Teste@123",
      cidade: "Porto Velho",
      uf: "RO",
    };

    await service.cadastrar(dados);

    expect(mockAutenticacaoService.cadastrar).toHaveBeenCalledWith(dados);
    expect(mockUsuarioRepository.atualizar).not.toHaveBeenCalled();
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

    expect(mockAutenticacaoService.cadastrar).not.toHaveBeenCalled();
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

    expect(mockAutenticacaoService.cadastrar).not.toHaveBeenCalled();
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

  test("campos de acesso nao sao alterados e a senha e delegada ao Better Auth — RN-USR-013", async () => {
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
    expect(mockAutenticacaoService.atualizarSenhaUsuario).toHaveBeenCalledWith(
      "507f1f77bcf86cd799439012",
      "tentativa",
    );
  });
});

describe("UsuarioService.excluir", () => {
  const usuario = {
    _id: "507f1f77bcf86cd799439012",
    email: "teste@email.com",
  };

  test("deve excluir usuario com sucesso (soft delete) — RF-020", async () => {
    mockUsuarioRepository.buscarPorId.mockResolvedValue(usuario);
    mockItemDoacaoRepository.buscarEmAndamentoPorUsuario.mockResolvedValue([]);
    mockUsuarioRepository.atualizar.mockResolvedValue({});
    mockItemDoacaoRepository.cancelarItensPorUsuario.mockResolvedValue({});
    mockAutenticacaoService.verificarSenhaUsuario.mockResolvedValue(true);

    const resultado = await service.excluir(
      "507f1f77bcf86cd799439012",
      "Teste@123",
    );

    expect(resultado.message).toBe("Conta excluída com sucesso.");
    expect(mockAutenticacaoService.verificarSenhaUsuario).toHaveBeenCalledWith(
      "507f1f77bcf86cd799439012",
      "Teste@123",
    );
    expect(mockAutenticacaoService.revogarSessoesUsuario).toHaveBeenCalledWith(
      "507f1f77bcf86cd799439012",
    );
  });

  test("deve anonimizar os dados e cancelar itens ao excluir", async () => {
    mockUsuarioRepository.buscarPorId.mockResolvedValue(usuario);
    mockItemDoacaoRepository.buscarEmAndamentoPorUsuario.mockResolvedValue([]);
    mockUsuarioRepository.atualizar.mockResolvedValue({});
    mockItemDoacaoRepository.cancelarItensPorUsuario.mockResolvedValue({});
    mockAutenticacaoService.verificarSenhaUsuario.mockResolvedValue(true);

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
    mockAutenticacaoService.verificarSenhaUsuario.mockResolvedValue(false);

    await expect(
      service.excluir("507f1f77bcf86cd799439012", "SenhaErrada"),
    ).rejects.toMatchObject({ statusCode: 401 });
  });

  test("deve lancar 400 se tiver itens em andamento — RN-USR-019", async () => {
    mockUsuarioRepository.buscarPorId.mockResolvedValue(usuario);
    mockItemDoacaoRepository.buscarEmAndamentoPorUsuario.mockResolvedValue([
      { _id: "item1" },
    ]);
    mockAutenticacaoService.verificarSenhaUsuario.mockResolvedValue(true);

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
    expect(mockAutenticacaoService.revogarSessoesUsuario).toHaveBeenCalledWith(
      "123",
    );
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
