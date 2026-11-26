import { describe, expect, jest, test } from "@jest/globals";
import UsuarioRepository from "../../repositories/UsuarioRepository.js";

describe("UsuarioRepository", () => {
  test("buscarPorEmail normaliza o e-mail e retorna somente os dados de domínio", async () => {
    const findUnique = jest.fn().mockResolvedValue({
      id: "fb55a3c6-dc66-4d46-aeb0-7fca9b3beab7",
      nome: "Usuario de teste",
      email: "usuario@doai.local",
    });
    const repository = new UsuarioRepository();

    Object.defineProperty(repository, "client", {
      value: { usuario: { findUnique } },
    });

    const usuario = await repository.buscarPorEmail(" USUARIO@DOAI.LOCAL ");

    expect(findUnique).toHaveBeenCalledWith({
      where: { email: "usuario@doai.local" },
    });
    expect(usuario.email).toBe("usuario@doai.local");
    expect(usuario.toObject()).toEqual(
      expect.objectContaining({
        _id: "fb55a3c6-dc66-4d46-aeb0-7fca9b3beab7",
        nome: "Usuario de teste",
      }),
    );
  });

  test("listarAdministradoresAtivos retorna somente IDs elegíveis para notificação", async () => {
    const findMany = jest.fn().mockResolvedValue([
      { id: "fb55a3c6-dc66-4d46-aeb0-7fca9b3beab7" },
    ]);
    const repository = new UsuarioRepository();

    Object.defineProperty(repository, "client", {
      value: { usuario: { findMany } },
    });

    const administradores = await repository.listarAdministradoresAtivos();

    expect(findMany).toHaveBeenCalledWith({
      where: {
        perfil: "ADMINISTRADOR",
        situacao: "ATIVO",
      },
      select: { id: true },
    });
    expect(administradores).toHaveLength(1);
    expect(administradores[0]._id).toBe("fb55a3c6-dc66-4d46-aeb0-7fca9b3beab7");
  });
});
describe("UsuarioRepository - completarCadastro", () => {
  const usuarioId = "fb55a3c6-dc66-4d46-aeb0-7fca9b3beab7";

  const dataAceite = new Date("2026-11-25T12:00:00.000Z");

  const dados = {
    cpf: "529.982.247-25",
    telefone: "69999999999",
    cidade: " Vilhena ",
    uf: "ro",
    termos_aceitos_em: dataAceite,
    versao_termos: "1.0"
  };

  // Simula a transação do Prisma sem acessar o banco real
  const criarRepository = () => {
    const updateMany = jest.fn();
    const findUnique = jest.fn();

    const repository = new UsuarioRepository();

    repository.withTransaction = jest.fn(async (operation) =>
      operation({
        usuario: {
          updateMany,
          findUnique
        }
      }));

    return { repository, updateMany, findUnique };
  };

  test("deve completar o cadastro de um usuário ativo", async () => {
    const { repository, updateMany, findUnique } = criarRepository();

    updateMany.mockResolvedValue({ count: 1 });

    findUnique.mockResolvedValue({
      id: usuarioId,
      cpf: "52998224725",
      telefone: "69999999999",
      cidade: "Vilhena",
      uf: "RO",
      situacao: "ATIVO",
      cadastro_completo: true,
      termos_aceitos_em: dataAceite,
      versao_termos: "1.0"
    });

    const resultado = await repository.completarCadastro(usuarioId, dados);

    expect(updateMany).toHaveBeenCalledWith({
      where: {
        id: usuarioId,
        situacao: "ATIVO",
        cadastro_completo: false
      },
      data: {
        cpf: "52998224725",
        telefone: "69999999999",
        cidade: "Vilhena",
        uf: "RO",
        cadastro_completo: true,
        termos_aceitos_em: dataAceite,
        versao_termos: "1.0"
      }
    });

    expect(findUnique).toHaveBeenCalledWith({ where: { id: usuarioId } });

    expect(resultado).toMatchObject({
      _id: usuarioId,
      cadastro_completo: true,
      termos_aceitos_em: dataAceite,
      versao_termos: "1.0"
    });

    expect(repository.withTransaction).toHaveBeenCalledTimes(1);
  });

  test("deve retornar null quando nenhuma conta atende aos filtros", async () => {
    const { repository, updateMany, findUnique } = criarRepository();

    updateMany.mockResolvedValue({ count: 0 });

    const resultado = await repository.completarCadastro(usuarioId, dados);

    expect(resultado).toBeNull();
    expect(findUnique).not.toHaveBeenCalled();
  });

  test("deve ignorar campos não permitidos na atualização", async () => {
    const { repository, updateMany, findUnique } = criarRepository();

    updateMany.mockResolvedValue({ count: 1 });

    findUnique.mockResolvedValue({ id: usuarioId, cadastro_completo: true });

    await repository.completarCadastro(usuarioId, {
      ...dados,
      perfil: "ADMINISTRADOR",
      situacao: "INATIVO",
      email: "alterado@example.invalid",
      nome: "Nome alterado",
      cadastro_completo: false
    });

    const dadosPersistidos = updateMany.mock.calls[0][0].data;

    expect(dadosPersistidos).not.toHaveProperty("perfil");
    expect(dadosPersistidos).not.toHaveProperty("situacao");
    expect(dadosPersistidos).not.toHaveProperty("email");
    expect(dadosPersistidos).not.toHaveProperty("nome");

    expect(dadosPersistidos.cadastro_completo).toBe(true);
  });

  test("deve tratar erro de CPF duplicado do Prisma", async () => {
    const { repository, updateMany, findUnique } = criarRepository();

    const erroPrisma = Object.assign(new Error("Restrição de unicidade"),
      {
        code: "P2002",
        meta: {
          target: ["cpf"]
        }
      }
    );

    updateMany.mockRejectedValue(erroPrisma);

    await expect(repository.completarCadastro(usuarioId, dados)
    ).rejects.toMatchObject({
      code: 11000,
      keyValue: {
        cpf: "duplicado"
      }
    });

    expect(findUnique).not.toHaveBeenCalled();
  });

  test("deve propagar erros inesperados do banco", async () => {
    const { repository, updateMany, findUnique, } = criarRepository();

    const erro = new Error("Falha de conexão com o banco");

    updateMany.mockRejectedValue(erro);

    await expect(repository.completarCadastro(usuarioId, dados)
    ).rejects.toBe(erro);

    expect(findUnique).not.toHaveBeenCalled();
  });
});
describe("UsuarioRepository - removerCadastroIncompleto", () => {
  const usuarioId = "fb55a3c6-dc66-4d46-aeb0-7fca9b3beab7";

  const criarRepository = () => {
    const deleteMany = jest.fn();
    const repository = new UsuarioRepository();

    Object.defineProperty(repository, "client", {
      value: {
        usuario: {
          deleteMany,
        },
      },
    });

    return { repository, deleteMany };
  };

  test("deve remover uma conta incompleta elegível para compensação", async () => {
    const { repository, deleteMany } = criarRepository();

    deleteMany.mockResolvedValue({ count: 1 });

    const resultado =
      await repository.removerCadastroIncompleto(usuarioId);

    expect(resultado).toBe(true);
    expect(deleteMany).toHaveBeenCalledTimes(1);
  });

  test("deve aplicar todos os filtros de segurança na exclusão", async () => {
    const { repository, deleteMany } = criarRepository();

    deleteMany.mockResolvedValue({ count: 1 });

    await repository.removerCadastroIncompleto(usuarioId);

    expect(deleteMany).toHaveBeenCalledWith({
      where: {
        id: usuarioId,
        cadastro_completo: false,
        cpf: null,
        perfil: "USUARIO",
        situacao: "ATIVO",
        sessions: {
          none: {},
        },
        accounts: {
          some: {
            providerId: "credential",
          },
          every: {
            providerId: "credential",
          },
        },
      },
    });
  });

  test("deve retornar false quando nenhuma conta atende aos filtros", async () => {
    const { repository, deleteMany } = criarRepository();

    deleteMany.mockResolvedValue({ count: 0 });

    const resultado =
      await repository.removerCadastroIncompleto(usuarioId);

    expect(resultado).toBe(false);
    expect(deleteMany).toHaveBeenCalledTimes(1);
  });

  test("deve normalizar o identificador para string", async () => {
    const { repository, deleteMany } = criarRepository();

    deleteMany.mockResolvedValue({ count: 0 });

    await repository.removerCadastroIncompleto(123);

    expect(deleteMany).toHaveBeenCalledWith({
      where: expect.objectContaining({
        id: "123",
      }),
    });
  });

  test("deve propagar falhas inesperadas do banco", async () => {
    const { repository, deleteMany } = criarRepository();

    const erro = new Error("Falha de conexão com o banco");

    deleteMany.mockRejectedValue(erro);

    await expect(
      repository.removerCadastroIncompleto(usuarioId)
    ).rejects.toBe(erro);
  });

  test("deve retornar false caso a quantidade removida seja inesperada", async () => {
    const { repository, deleteMany } = criarRepository();

    deleteMany.mockResolvedValue({ count: 2 });

    const resultado =
      await repository.removerCadastroIncompleto(usuarioId);

    expect(resultado).toBe(false);
  });
});