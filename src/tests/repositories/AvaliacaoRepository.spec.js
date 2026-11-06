import { beforeEach, describe, expect, jest, test } from "@jest/globals";
import AvaliacaoRepository from "../../repositories/AvaliacaoRepository.js";

function criarContexto() {
    const delegate = {
        aggregate: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn()
    }

    const client = {
        avaliacao: delegate,
        $queryRaw: jest.fn()
    }

    const repository = new AvaliacaoRepository()

    Object.defineProperty(repository, "client", {
        configurable: true,
        value: client
    })

    return { repository, delegate, client }
}

describe("AvaliacaoRepository", () => {

    beforeEach(() => {
        jest.clearAllMocks()
    })

    test("inicializa com o delegate e os relacionamentos corretos", () => {
        const { repository, delegate } = criarContexto()

        expect(repository.delegateName).toBe("avaliacao")
        expect(repository.delegate).toBe(delegate)

        expect(repository.relationMap).toEqual({
            item_id: "item",
            avaliador_id: "avaliador",
            avaliado_id: "avaliado"
        })
    })

    describe("normalizeData", () => {

        test("remove espaços do comentário", () => {
            const { repository } = criarContexto()

            const resultado = repository.normalizeData({
                _id: "ignorar",
                comentario: "  Excelente doador!  ",
                nota: 5
            })

            expect(resultado).toEqual({
                comentario: "Excelente doador!",
                nota: 5
            })
        })

        test("mantém comentários que não são strings", () => {
            const { repository } = criarContexto()

            expect(repository.normalizeData({ comentario: null, nota: 4 })
            ).toEqual({ comentario: null, nota: 4 })

            expect(repository.normalizeData({ nota: 5 })).toEqual({ nota: 5 })
        })
    })

    describe("bloquearAvaliado", () => {

        test("executa bloqueio transacional do usuário avaliado", async () => {
            const { repository, client } = criarContexto()

            client.$queryRaw.mockResolvedValue([{ id: "usuario-1" }])

            await repository.bloquearAvaliado("usuario-1")

            expect(client.$queryRaw).toHaveBeenCalledTimes(1)

            const [strings, usuarioId] = client.$queryRaw.mock.calls[0]

            expect(strings.join("?")).toContain('SELECT id FROM "Usuario" WHERE id = ? FOR NO KEY UPDATE')
            expect(usuarioId).toBe("usuario-1")
        })

        test("converte o ID do avaliado para string", async () => {
            const { repository, client } = criarContexto()

            client.$queryRaw.mockResolvedValue([])

            await repository.bloquearAvaliado(123)

            const [, usuarioId] = client.$queryRaw.mock.calls[0]

            expect(usuarioId).toBe("123")
        })

        test("propaga erros da consulta SQL", async () => {
            const { repository, client } = criarContexto()
            const erro = new Error("Falha no bloqueio")

            client.$queryRaw.mockRejectedValue(erro)

            await expect(repository.bloquearAvaliado("usuario-1")
            ).rejects.toBe(erro)
        })
    })

    describe("agregarPorAvaliado", () => {

        test("retorna quantidade e média das avaliações", async () => {
            const { repository, delegate } = criarContexto()

            delegate.aggregate.mockResolvedValue({
                _count: { _all: 3 },
                _avg: { nota: 4.5 },
            })

            const resultado = await repository.agregarPorAvaliado("usuario-1")

            expect(delegate.aggregate).toHaveBeenCalledWith({
                where: { avaliado_id: "usuario-1" },
                _count: { _all: true },
                _avg: { nota: true },
            })

            expect(resultado).toEqual({ total: 3, media: 4.5 })
        })

        test("retorna média zero quando não existem avaliações", async () => {
            const { repository, delegate } = criarContexto()

            delegate.aggregate.mockResolvedValue({
                _count: { _all: 0 },
                _avg: { nota: null },
            })

            const resultado = await repository.agregarPorAvaliado("usuario-1")

            expect(resultado).toEqual({ total: 0, media: 0 })
        })

        test("propaga erros da agregação", async () => {
            const { repository, delegate } = criarContexto()
            const erro = new Error("Falha na agregação")

            delegate.aggregate.mockRejectedValue(erro)

            await expect(repository.agregarPorAvaliado("usuario-1")
            ).rejects.toBe(erro)
        })
    })

    describe("consultas por filtros individuais", () => {

        test.each([
            ["buscarPorAvaliador", "avaliador_id"],
            ["buscarPorAvaliado", "avaliado_id"],
            ["buscarPorItem", "item_id"],
            ["buscarPorTipo", "tipo"],
        ])(
            "%s consulta corretamente pelo campo %s",
            async (metodo, campo) => {
                const { repository, delegate } = criarContexto()

                delegate.findFirst.mockResolvedValue({
                    id: "avaliacao-1",
                    [campo]: "valor",
                    nota: 5,
                })

                const resultado = await repository[metodo]("valor")

                expect(delegate.findFirst).toHaveBeenCalledWith({
                    where: { [campo]: "valor" }
                })

                expect(resultado).toMatchObject({ _id: "avaliacao-1", nota: 5 })
            }
        )

        test("retorna null quando não encontra avaliação", async () => {
            const { repository, delegate } = criarContexto()

            delegate.findFirst.mockResolvedValue(null)

            await expect(repository.buscarPorAvaliador("inexistente")
            ).resolves.toBeNull()
        })

        test("busca avaliação por avaliador, item e tipo", async () => {
            const { repository, delegate } = criarContexto()

            delegate.findFirst.mockResolvedValue({ id: "avaliacao-1", nota: 5 })

            const resultado = await repository.buscarPorAvaliadorItemTipo(
                "avaliador-1",
                "item-1",
                "DOADOR"
            )

            expect(delegate.findFirst).toHaveBeenCalledWith({
                where: {
                    avaliador_id: "avaliador-1",
                    item_id: "item-1",
                    tipo: "DOADOR"
                },
            })

            expect(resultado).toMatchObject({ _id: "avaliacao-1", nota: 5 })
        })

    })

    describe("listarResumoPorUsuario", () => {

        test("retorna avaliações resumidas do usuário", async () => {
            const { repository, delegate } = criarContexto()

            delegate.findMany.mockResolvedValue([
                {
                    id: "avaliacao-1",
                    nota: 5,
                    tipo: "DOADOR",
                    comentario: "Excelente",
                    data_avaliacao: new Date("2026-01-10"),
                    item: {
                        id: "item-1",
                        titulo: "Mesa"
                    },
                    avaliador: {
                        id: "usuario-1",
                        nome: "Maria"
                    },
                    avaliado: {
                        id: "usuario-2",
                        nome: "João"
                    }
                }
            ])

            const resultado = await repository.listarResumoPorUsuario("usuario-1")

            expect(delegate.findMany).toHaveBeenCalledWith({
                where: {
                    OR: [
                        { avaliador_id: "usuario-1" },
                        { avaliado_id: "usuario-1" }
                    ]
                },
                include: {
                    item: {
                        select: {
                            id: true,
                            titulo: true
                        }
                    },
                    avaliador: {
                        select: {
                            id: true,
                            nome: true
                        }
                    },
                    avaliado: {
                        select: {
                            id: true,
                            nome: true
                        }
                    }
                },
                orderBy: {
                    data_avaliacao: "desc"
                },
                take: 10,
            })

            expect(resultado).toHaveLength(1)

            expect(resultado[0]).toMatchObject({
                _id: "avaliacao-1",
                nota: 5,
                tipo: "DOADOR",
                item_id: {
                    _id: "item-1",
                    titulo: "Mesa"
                },
                avaliador_id: {
                    _id: "usuario-1",
                    nome: "Maria"
                },
                avaliado_id: {
                    _id: "usuario-2",
                    nome: "João"
                }
            })

            expect(resultado[0]).not.toHaveProperty("comentario")
        })

        test("utiliza limite personalizado", async () => {
            const { repository, delegate } = criarContexto()

            delegate.findMany.mockResolvedValue([])

            const resultado = await repository.listarResumoPorUsuario("usuario-1", 5)

            expect(delegate.findMany).toHaveBeenCalledWith(
                expect.objectContaining({ take: 5 })
            )

            expect(resultado).toEqual([])
        })

        test("propaga erros durante a listagem resumida", async () => {
            const { repository, delegate } = criarContexto()
            const erro = new Error("Falha na listagem")

            delegate.findMany.mockRejectedValue(erro)

            await expect(repository.listarResumoPorUsuario("usuario-1")
            ).rejects.toBe(erro)
        })
    })

    describe("listar", () => {

        test("lista avaliações sem filtros com valores padrão", async () => {
            const { repository } = criarContexto()
            const listar = jest.spyOn(repository, "listarComPaginacao"
            ).mockResolvedValue({ docs: [], totalDocs: 0 })

            const resultado = await repository.listar({})

            expect(listar).toHaveBeenCalledWith({}, {
                page: 1,
                limit: 15,
                sort: { data_avaliacao: -1 },
                populate: [
                    {
                        path: "avaliador_id",
                        select: "nome"
                    },
                    {
                        path: "avaliado_id",
                        select: "nome"
                    },
                    {
                        path: "item_id",
                        select: "titulo"
                    }
                ]
            })

            expect(resultado).toEqual({ docs: [], totalDocs: 0 })

            listar.mockRestore()
        })

        test("aplica filtros e paginação personalizados", async () => {
            const { repository } = criarContexto()

            const listar = jest.spyOn(repository, "listarComPaginacao"
            ).mockResolvedValue({ docs: [] })

            await repository.listar({
                filtros: {
                    avaliador_id: "avaliador-1",
                    avaliado_id: "avaliado-1",
                    item_id: "item-1",
                    tipo: "DOADOR"
                },
                page: 3,
                limit: 5
            })

            expect(listar).toHaveBeenCalledWith(
                {
                    avaliador_id: "avaliador-1",
                    avaliado_id: "avaliado-1",
                    item_id: "item-1",
                    tipo: "DOADOR"
                },
                expect.objectContaining({
                    page: 3,
                    limit: 5
                })
            )

            listar.mockRestore()
        })

        test("restringe resultados ao usuário informado", async () => {
            const { repository } = criarContexto()
            const listar = jest.spyOn(repository, "listarComPaginacao"
            ).mockResolvedValue({ docs: [] })

            await repository.listar({ usuarioId: "usuario-1" })

            expect(listar).toHaveBeenCalledWith({
                $or: [
                    { avaliador_id: "usuario-1" },
                    { avaliado_id: "usuario-1" }
                ]
            },
                expect.objectContaining({ page: 1, limit: 15 })
            )

            listar.mockRestore()
        })

        test("combina filtros com restrição por usuário", async () => {
            const { repository } = criarContexto()

            const listar = jest.spyOn(repository, "listarComPaginacao"
            ).mockResolvedValue({ docs: [] })

            await repository.listar({
                filtros: {
                    tipo: "DOADOR",
                    item_id: "item-1"
                },
                usuarioId: "usuario-1"
            })

            expect(listar).toHaveBeenCalledWith(
                {
                    tipo: "DOADOR",
                    item_id: "item-1",
                    $or: [
                        { avaliador_id: "usuario-1" },
                        { avaliado_id: "usuario-1" }
                    ]
                },
                expect.any(Object)
            )

            listar.mockRestore()
        })
    })

})
