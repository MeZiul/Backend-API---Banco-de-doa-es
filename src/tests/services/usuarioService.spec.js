import { beforeEach, describe, expect, jest, test } from "@jest/globals";
import UsuarioService from "../../services/UsuarioService.js";
import CustomError from "../../utils/helpers/CustomError.js";

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

let service;

beforeEach(() => {
  Object.values(mockUsuarioRepository).forEach((fn) => fn.mockReset());
  Object.values(mockItemDoacaoRepository).forEach((fn) => fn.mockReset());
  Object.values(mockAvaliacaoRepository).forEach((fn) => fn.mockReset());

  service = new UsuarioService({
    usuarioRepository: mockUsuarioRepository,
    itemDoacaoRepository: mockItemDoacaoRepository,
    avaliacaoRepository: mockAvaliacaoRepository,
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

  test("deve lancar 400 se email ja cadastrado — RN-USR-006", async () => {
    mockUsuarioRepository.buscarPorEmail.mockResolvedValue({ _id: "123" });

    await expect(
      service.cadastrar({
        email: "existente@email.com",
        cpf: "111",
        senha: "Teste@123",
      }),
    ).rejects.toMatchObject({ statusCode: 409 });
  });

  test("deve lancar 409 se CPF ja cadastrado — RN-USR-006", async () => {
    mockUsuarioRepository.buscarPorEmail.mockResolvedValue(null);
    mockUsuarioRepository.buscarPorCpf.mockResolvedValue({ _id: "123" });

    await expect(
      service.cadastrar({
        email: "novo@email.com",
        cpf: "111.111.111-11",
        senha: "Teste@123",
      }),
    ).rejects.toMatchObject({ statusCode: 409 });
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
    toObject: () => ({
      _id: "507f1f77bcf86cd799439012",
      nome: "Teste Silva",
      email: "teste@email.com",
      perfil: "USUARIO",
      situacao: "ATIVO",
      senha: "$2b$10$hashedpassword",
    }),
  };

  test("deve retornar token e usuario sem senha — RF-002", async () => {
    mockUsuarioRepository.buscarPorEmailComSenha.mockResolvedValue(usuarioMock);

    jest
      .spyOn((await import("bcryptjs")).default, "compare")
      .mockResolvedValue(true);

    const resultado = await service.login("teste@email.com", "Teste@123");

    expect(resultado.token).toBeDefined();
    expect(resultado.usuario.senha).toBeUndefined();
  });

  test("deve lancar 401 se usuario nao encontrado — RN-USR-009", async () => {
    mockUsuarioRepository.buscarPorEmailComSenha.mockResolvedValue(null);

    await expect(
      service.login("naoexiste@email.com", "qualquer"),
    ).rejects.toMatchObject({ statusCode: 401 });
  });

  test("deve lancar 403 se conta suspensa — RN-USR-010", async () => {
    mockUsuarioRepository.buscarPorEmailComSenha.mockResolvedValue({
      ...usuarioMock,
      situacao: "SUSPENSO",
      suspensao_ate: new Date(),
      motivo_suspensao: "Teste",
    });

    jest
      .spyOn((await import("bcryptjs")).default, "compare")
      .mockResolvedValue(true);

    await expect(
      service.login("teste@email.com", "Teste@123"),
    ).rejects.toMatchObject({ statusCode: 403 });
  });

  test("deve lancar 403 se conta inativa — RN-USR-010", async () => {
    mockUsuarioRepository.buscarPorEmailComSenha.mockResolvedValue({
      ...usuarioMock,
      situacao: "INATIVO",
      toObject: () => ({ ...usuarioMock, situacao: "INATIVO" }),
    });

    jest
      .spyOn((await import("bcryptjs")).default, "compare")
      .mockResolvedValue(true);

    await expect(
      service.login("teste@email.com", "Teste@123"),
    ).rejects.toMatchObject({ statusCode: 403 });
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

  test("CPF nao deve ser alterado — RN-USR-013", async () => {
    mockUsuarioRepository.buscarPorId.mockResolvedValue({
      _id: "507f1f77bcf86cd799439012",
    });
    mockUsuarioRepository.buscarPorEmail.mockResolvedValue(null);
    mockUsuarioRepository.atualizar.mockResolvedValue({
      _id: "507f1f77bcf86cd799439012",
    });

    await service.atualizar(
      "507f1f77bcf86cd799439012",
      { cpf: "999.999.999-99", nome: "Teste" },
      { id: "507f1f77bcf86cd799439012", perfil: "USUARIO" },
    );

    const chamada = mockUsuarioRepository.atualizar.mock.calls[0][1];
    expect(chamada.cpf).toBeUndefined();
  });
});

describe("UsuarioService.excluir", () => {
  test("deve excluir usuario com sucesso — RF-020", async () => {
    const usuario = {
      _id: "507f1f77bcf86cd799439012",
      email: "teste@email.com",
      senha: "$2b$10$hash",
    };
    mockUsuarioRepository.buscarPorId.mockResolvedValue(usuario);
    mockUsuarioRepository.buscarPorEmailComSenha.mockResolvedValue(usuario);
    mockItemDoacaoRepository.buscarEmAndamentoPorUsuario.mockResolvedValue([]);
    mockUsuarioRepository.atualizar.mockResolvedValue({});
    mockItemDoacaoRepository.cancelarItensPorUsuario.mockResolvedValue({});

    jest
      .spyOn((await import("bcryptjs")).default, "compare")
      .mockResolvedValue(true);

    const resultado = await service.excluir(
      "507f1f77bcf86cd799439012",
      "Teste@123",
    );
    expect(resultado.message).toBe("Conta excluída com sucesso.");
  });

  test("deve lancar 401 se senha incorreta — RN-USR-018", async () => {
    const usuario = {
      _id: "507f1f77bcf86cd799439012",
      email: "teste@email.com",
      senha: "$2b$10$hash",
    };
    mockUsuarioRepository.buscarPorId.mockResolvedValue(usuario);
    mockUsuarioRepository.buscarPorEmailComSenha.mockResolvedValue(usuario);

    jest
      .spyOn((await import("bcryptjs")).default, "compare")
      .mockResolvedValue(false);

    await expect(
      service.excluir("507f1f77bcf86cd799439012", "SenhaErrada"),
    ).rejects.toMatchObject({ statusCode: 401 });
  });

  test("deve lancar 400 se tiver itens em andamento — RN-USR-019", async () => {
    const usuario = {
      _id: "507f1f77bcf86cd799439012",
      email: "teste@email.com",
      senha: "$2b$10$hash",
    };
    mockUsuarioRepository.buscarPorId.mockResolvedValue(usuario);
    mockUsuarioRepository.buscarPorEmailComSenha.mockResolvedValue(usuario);
    mockItemDoacaoRepository.buscarEmAndamentoPorUsuario.mockResolvedValue([
      { _id: "item1" },
    ]);

    jest
      .spyOn((await import("bcryptjs")).default, "compare")
      .mockResolvedValue(true);

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
