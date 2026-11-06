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

});

function criarContextoUsuario() {
    const repository = new UsuarioRepository()

    const delegate = {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        updateMany: jest.fn()
    }

    const client = {
        usuario: delegate,
        $queryRaw: jest.fn(),
        $transaction: jest.fn(async (callback) =>
            callback({ usuario: delegate })
        )
    }

    Object.defineProperty(repository, "client", {
        configurable: true,
        value: client
    })

    return { repository, delegate, client }
}

describe("UsuarioRepository - cobertura complementar", () => {

    test("inicializa com o delegate usuario", () => {
        const { repository, delegate } = criarContextoUsuario()

        expect(repository.delegateName).toBe("usuario")
        expect(repository.delegate).toBe(delegate)
    })

    describe("normalizeData", () => {

        test("normaliza nome, email e UF", () => {
            const { repository } = criarContextoUsuario()

            const resultado = repository.normalizeData({
                _id: "ignorar",
                nome: "  Maria Silva  ",
                email: "  MARIA@EMAIL.COM  ",
                uf: "  ro  ",
                cidade: "Vilhena"
            })

            expect(resultado).toEqual({
                nome: "Maria Silva",
                email: "maria@email.com",
                uf: "RO",
                cidade: "Vilhena"
            })
        })

        test("preserva campos ausentes ou não textuais", () => {
            const { repository } = criarContextoUsuario()

            expect(repository.normalizeData({nome: null,email: undefined,uf: 123})
          ).toEqual({nome: null,email: undefined,uf: 123})

            expect(repository.normalizeData({cidade: "Vilhena"})).toEqual({cidade: "Vilhena"})
        })
    })

    describe("buscarPorEmail", () => {

        test("retorna null quando usuário não existe", async () => {
            const { repository, delegate } = criarContextoUsuario()

            delegate.findUnique.mockResolvedValue(null)

            const resultado = await repository.buscarPorEmail(
                "inexistente@email.com"
            )

            expect(resultado).toBeNull()
        })

    })

    describe("buscarPorCpf", () => {

        test("busca usuário pelo CPF sem máscara", async () => {
            const { repository, delegate, client } =
                criarContextoUsuario()

            delegate.findUnique.mockResolvedValue({
                id: "usuario-1",
                cpf: "12345678909",
                nome: "Maria",
            })

            const resultado = await repository.buscarPorCpf(
                "123.456.789-09"
            )

            expect(delegate.findUnique).toHaveBeenCalledWith({
                where: { cpf: "12345678909" },
            })

            expect(resultado).toMatchObject({
                _id: "usuario-1",
                cpf: "12345678909",
                nome: "Maria",
            })

            expect(client.$queryRaw).not.toHaveBeenCalled()
        })

        test("busca CPF histórico quando consulta direta não encontra", async () => {
            const { repository, delegate, client } =
                criarContextoUsuario()

            delegate.findUnique.mockResolvedValue(null)
            client.$queryRaw.mockResolvedValue([
                { id: "usuario-legado" },
            ])

            const buscarPorId = jest.spyOn(repository, "buscarPorId")
                .mockResolvedValue({
                    _id: "usuario-legado",
                    nome: "Usuário histórico",
                })

            const resultado = await repository.buscarPorCpf(
                "123.456.789-09"
            )

            expect(client.$queryRaw).toHaveBeenCalledTimes(1)

            const [strings, cpfNormalizado] =
                client.$queryRaw.mock.calls[0]

            expect(strings.join("?")).toContain(
                'regexp_replace("cpf"'
            )

            expect(cpfNormalizado).toBe("12345678909")

            expect(buscarPorId).toHaveBeenCalledWith(
                "usuario-legado"
            )

            expect(resultado).toEqual({
                _id: "usuario-legado",
                nome: "Usuário histórico",
            })
        })

        test("retorna null quando CPF não é encontrado", async () => {
            const { repository, delegate, client } =
                criarContextoUsuario()

            delegate.findUnique.mockResolvedValue(null)
            client.$queryRaw.mockResolvedValue([])

            const resultado = await repository.buscarPorCpf(
                "12345678909"
            )

            expect(resultado).toBeNull()
        })

        test("propaga erros da consulta SQL de compatibilidade", async () => {
            const { repository, delegate, client } =
                criarContextoUsuario()

            const erro = new Error("Falha na consulta histórica")

            delegate.findUnique.mockResolvedValue(null)
            client.$queryRaw.mockRejectedValue(erro)

            await expect(
                repository.buscarPorCpf("12345678909")
            ).rejects.toBe(erro)
        })
    })

    describe("atualizarSeSituacao", () => {

        test("atualiza usuário quando situação corresponde", async () => {
            const { repository, delegate, client } =
                criarContextoUsuario()

            delegate.updateMany.mockResolvedValue({ count: 1 })
            delegate.findUnique.mockResolvedValue({
                id: "usuario-1",
                nome: "Maria",
                situacao: "SUSPENSO",
            })

            const resultado = await repository.atualizarSeSituacao(
                "usuario-1",
                "ATIVO",
                {
                    nome: "  Maria  ",
                    situacao: "SUSPENSO",
                }
            )

            expect(client.$transaction).toHaveBeenCalledTimes(1)

            expect(delegate.updateMany).toHaveBeenCalledWith({
                where: {
                    id: "usuario-1",
                    situacao: "ATIVO",
                },
                data: {
                    nome: "Maria",
                    situacao: "SUSPENSO",
                },
            })

            expect(delegate.findUnique).toHaveBeenCalledWith({
                where: { id: "usuario-1" },
            })

            expect(resultado).toMatchObject({
                _id: "usuario-1",
                situacao: "SUSPENSO",
            })
        })

        test("aceita múltiplas situações esperadas", async () => {
            const { repository, delegate } = criarContextoUsuario()

            delegate.updateMany.mockResolvedValue({ count: 1 })
            delegate.findUnique.mockResolvedValue({
                id: "usuario-1",
                situacao: "ATIVO",
            })

            await repository.atualizarSeSituacao(
                123,
                ["SUSPENSO", "INATIVO"],
                { situacao: "ATIVO" },
                { email: "usuario@email.com" }
            )

            expect(delegate.updateMany).toHaveBeenCalledWith({
                where: {
                    id: "123",
                    situacao: {
                        in: ["SUSPENSO", "INATIVO"],
                    },
                    email: "usuario@email.com",
                },
                data: {
                    situacao: "ATIVO",
                },
            })
        })

        test("retorna null quando situação não corresponde", async () => {
            const { repository, delegate } = criarContextoUsuario()

            delegate.updateMany.mockResolvedValue({ count: 0 })

            const resultado = await repository.atualizarSeSituacao(
                "usuario-1",
                "ATIVO",
                { situacao: "SUSPENSO" }
            )

            expect(resultado).toBeNull()
            expect(delegate.findUnique).not.toHaveBeenCalled()
        })

        test("converte erro de unicidade do Prisma", async () => {
            const { repository, delegate } = criarContextoUsuario()

            delegate.updateMany.mockRejectedValue(
                Object.assign(new Error("Duplicado"), {
                    code: "P2002",
                    meta: { target: ["email"] },
                })
            )

            await expect(
                repository.atualizarSeSituacao(
                    "usuario-1",
                    "ATIVO",
                    { email: "duplicado@email.com" }
                )
            ).rejects.toMatchObject({
                code: 11000,
            })
        })

        test("propaga erros comuns da atualização", async () => {
            const { repository, delegate } = criarContextoUsuario()
            const erro = new Error("Falha na atualização")

            delegate.updateMany.mockRejectedValue(erro)

            await expect(
                repository.atualizarSeSituacao(
                    "usuario-1",
                    "ATIVO",
                    { situacao: "SUSPENSO" }
                )
            ).rejects.toBe(erro)
        })
    })

    describe("listar", () => {

        test("utiliza paginação e filtros padrão", () => {
            const { repository } = criarContextoUsuario()

            const listar = jest.spyOn(
                repository,
                "listarComPaginacao"
            ).mockReturnValue({ docs: [] })

            const resultado = repository.listar({})

            expect(listar).toHaveBeenCalledWith(
                {},
                {
                    page: 1,
                    limit: 15,
                    sort: { data_cadastro: -1 },
                }
            )

            expect(resultado).toEqual({ docs: [] })
        })

        test("aplica filtros e paginação personalizados", () => {
            const { repository } = criarContextoUsuario()

            const listar = jest.spyOn(
                repository,
                "listarComPaginacao"
            ).mockReturnValue({ docs: [] })

            repository.listar({
                filtros: {
                    nome: "Maria",
                    cidade: "Vilhena",
                    uf: "RO",
                    situacao: "ATIVO",
                },
                page: 2,
                limit: 5,
            })

            expect(listar).toHaveBeenCalledWith(
                {
                    nome: {
                        $regex: "Maria",
                        $options: "i",
                    },
                    cidade: {
                        $regex: "Vilhena",
                        $options: "i",
                    },
                    uf: "RO",
                    situacao: "ATIVO",
                },
                {
                    page: 2,
                    limit: 5,
                    sort: { data_cadastro: -1 },
                }
            )
        })
    })

    describe("listarParaAdministracao", () => {

        test("utiliza paginação padrão e seleção segura", () => {
            const { repository } = criarContextoUsuario()

            const listar = jest.spyOn(
                repository,
                "listarComPaginacao"
            ).mockReturnValue({ docs: [] })

            repository.listarParaAdministracao({})

            const [filtro, opcoes] = listar.mock.calls[0]

            expect(filtro).toEqual({})
            expect(opcoes.page).toBe(1)
            expect(opcoes.limit).toBe(15)
            expect(opcoes.sort).toEqual({
                data_cadastro: -1,
            })

            expect(opcoes.select).toContain("nome")
            expect(opcoes.select).toContain("email")
            expect(opcoes.select).toContain("perfil")
            expect(opcoes.select).toContain("situacao")
            expect(opcoes.select).not.toContain("senha")
        })

        test("aplica todos os filtros administrativos", () => {
            const { repository } = criarContextoUsuario()

            const listar = jest.spyOn(
                repository,
                "listarComPaginacao"
            ).mockReturnValue({ docs: [] })

            const inicio = "2026-01-01T00:00:00"
            const fim = "2026-01-31T00:00:00"

            const fimEsperado = new Date(fim)
            fimEsperado.setHours(23, 59, 59, 999)

            repository.listarParaAdministracao({
                filtros: {
                    nome: "Maria",
                    email: "maria@email.com",
                    cpf: "123.456",
                    cidade: "Vilhena",
                    uf: "RO",
                    situacao: "ATIVO",
                    perfil: "ADMINISTRADOR",
                    dataInicio: inicio,
                    dataFim: fim,
                },
                page: 3,
                limit: 10,
            })

            expect(listar).toHaveBeenCalledWith(
                {
                    nome: {
                        $regex: "Maria",
                        $options: "i",
                    },
                    email: {
                        $regex: "maria@email\\.com",
                        $options: "i",
                    },
                    cpf: {
                        $regex: "123\\.456",
                        $options: "i",
                    },
                    cidade: {
                        $regex: "Vilhena",
                        $options: "i",
                    },
                    uf: "RO",
                    situacao: "ATIVO",
                    perfil: "ADMINISTRADOR",
                    data_cadastro: {
                        $gte: new Date(inicio),
                        $lte: fimEsperado,
                    },
                },
                expect.objectContaining({
                    page: 3,
                    limit: 10,
                    sort: { data_cadastro: -1 },
                    select: expect.any(String),
                })
            )
        })
    })

    describe("buscarPorIdParaAdministracao", () => {

        test("utiliza seleção detalhada de campos", () => {
            const { repository } = criarContextoUsuario()

            const buscarPorId = jest.spyOn(
                repository,
                "buscarPorId"
            ).mockResolvedValue({
                _id: "usuario-1",
            })

            const resultado = repository.buscarPorIdParaAdministracao(
                "usuario-1"
            )

            expect(buscarPorId).toHaveBeenCalledWith(
                "usuario-1",
                {
                    select: expect.any(String),
                }
            )

            const select = buscarPorId.mock.calls[0][1].select

            expect(select).toContain("nome")
            expect(select).toContain("telefone")
            expect(select).toContain("foto_perfil")
            expect(select).toContain("motivo_suspensao")
            expect(select).not.toContain("senha")

            return expect(resultado).resolves.toEqual({
                _id: "usuario-1",
            })
        })
    })

    describe("listarAdministradoresAtivos", () => {

        test("retorna lista vazia quando não há administradores", async () => {
            const { repository, delegate } = criarContextoUsuario()

            delegate.findMany.mockResolvedValue([])

            const resultado =
                await repository.listarAdministradoresAtivos()

            expect(resultado).toEqual([])
        })

        test("mapeia múltiplos administradores", async () => {
            const { repository, delegate } = criarContextoUsuario()

            delegate.findMany.mockResolvedValue([
                { id: "admin-1" },
                { id: "admin-2" },
            ])

            const resultado =
                await repository.listarAdministradoresAtivos()

            expect(delegate.findMany).toHaveBeenCalledWith({
                where: {
                    perfil: "ADMINISTRADOR",
                    situacao: "ATIVO",
                },
                select: { id: true },
            })

            expect(resultado.map((admin) => admin._id)).toEqual([
                "admin-1",
                "admin-2",
            ])
        })
    })
})
