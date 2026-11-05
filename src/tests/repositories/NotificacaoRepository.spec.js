import { beforeEach, describe, expect, jest, test } from "@jest/globals";
import NotificacaoRepository from "../../repositories/NotificacaoRepository.js";

function criarContexto() {
    const delegate = {
        create: jest.fn(),
        count: jest.fn(),
        updateMany: jest.fn(),
        findUnique: jest.fn()
    }
    const transactionClient = { notificacao: delegate }
    const client = {
        notificacao: delegate,
        $transaction: jest.fn(async (callback) => callback(transactionClient)
        )
    }

    Object.defineProperty(NotificacaoRepository, "client", { configurable: true, value: client })

    return { delegate, client, transactionClient }
}

describe("NotificacaoRepository", () => {
    beforeEach(() => { jest.clearAllMocks() })

    test("utiliza o delegate de notificações", () => {
        const { delegate } = criarContexto()

        expect(NotificacaoRepository.delegateName).toBe("notificacao")
        expect(NotificacaoRepository.delegate).toBe(delegate)
    })

    test("retorna lista vazia quando não há notificações para criar", async () => {
        const { delegate, client } = criarContexto()
        const resultado = await NotificacaoRepository.criarMuitas([])

        expect(resultado).toEqual([])
        expect(delegate.create).not.toHaveBeenCalled()
        expect(client.$transaction).not.toHaveBeenCalled()
    })

    test("cria várias notificações dentro de uma transação", async () => {
        const { delegate, client } = criarContexto()
        const notificacoes = [
            {
                _id: "ignorar",
                usuario_id: "usuario-1",
                mensagem: "Primeira notificação"
            },
            {
                usuario_id: "usuario-2",
                mensagem: "Segunda notificação"
            }
        ]

        delegate.create.mockResolvedValueOnce({
            id: "notificacao-1",
            usuario_id: "usuario-1",
            mensagem: "Primeira notificação"
        }).mockResolvedValueOnce({
            id: "notificacao-2",
            usuario_id: "usuario-2",
            mensagem: "Segunda notificação"
        })

        const resultado = await NotificacaoRepository.criarMuitas(notificacoes)

        expect(client.$transaction).toHaveBeenCalledTimes(1)
        expect(delegate.create).toHaveBeenCalledTimes(2)

        expect(delegate.create).toHaveBeenNthCalledWith(1, {
            data: {
                usuario_id: "usuario-1",
                mensagem: "Primeira notificação"
            }
        })

        expect(delegate.create).toHaveBeenNthCalledWith(2, {
            data: {
                usuario_id: "usuario-2",
                mensagem: "Segunda notificação"
            }
        })

        expect(resultado).toMatchObject([
            { _id: "notificacao-1" },
            { _id: "notificacao-2" }
        ])
    })

    test("converte erro de unicidade durante criação em lote", async () => {
        const { delegate } = criarContexto()

        delegate.create.mockRejectedValue(
            Object.assign(new Error("Duplicado"), {
                code: "P2002",
                meta: { target: ["id"] }
            })
        )

        await expect(NotificacaoRepository.criarMuitas([{ usuario_id: "usuario-1", mensagem: "Teste" },])
        ).rejects.toMatchObject({ code: 11000 })
    })

    test("propaga erros comuns durante criação em lote", async () => {
        const { delegate } = criarContexto()
        const erro = new Error("Falha de persistência")

        delegate.create.mockRejectedValue(erro)

        await expect(NotificacaoRepository.criarMuitas([{ usuario_id: "usuario-1", mensagem: "Teste" },])
        ).rejects.toBe(erro)
    })

    test("lista notificações do usuário com paginação padrão", async () => {
        criarContexto()

        const listar = jest.spyOn(NotificacaoRepository, "listarComPaginacao").mockResolvedValue({ docs: [], totalDocs: 0 })
        const resultado = await NotificacaoRepository.listarDoUsuario("usuario-1")

        expect(listar).toHaveBeenCalledWith(
            { usuario_id: "usuario-1" },
            {
                page: 1,
                limit: 20,
                sort: { data_criacao: -1 }
            }
        )

        expect(resultado.docs).toEqual([])

        listar.mockRestore()
    })

    test("conta notificações não lidas de um usuário", async () => {
        const { delegate } = criarContexto()

        delegate.count.mockResolvedValue(5)

        const resultado = await NotificacaoRepository.contarNaoLidas("usuario-1")

        expect(delegate.count).toHaveBeenCalledWith({
            where: {
                usuario_id: "usuario-1",
                lida: false
            },
        })

        expect(resultado).toBe(5)
    })

    test("marca uma notificação como lida", async () => {
        const { delegate, client } = criarContexto()

        delegate.updateMany.mockResolvedValue({ count: 1 })
        delegate.findUnique.mockResolvedValue({
            id: "notificacao-1",
            usuario_id: "usuario-1",
            lida: true
        })

        const resultado = await NotificacaoRepository.marcarComoLida("notificacao-1", "usuario-1")

        expect(client.$transaction).toHaveBeenCalledTimes(1)

        expect(delegate.updateMany).toHaveBeenCalledWith({
            where: {
                id: "notificacao-1",
                usuario_id: "usuario-1"
            },
            data: { lida: true }
        })

        expect(delegate.findUnique).toHaveBeenCalledWith({ where: { id: "notificacao-1" } })

        expect(resultado).toMatchObject({ _id: "notificacao-1", lida: true })
    })

    test("retorna null quando nenhuma notificação é atualizada", async () => {
        const { delegate } = criarContexto()

        delegate.updateMany.mockResolvedValue({ count: 0 })

        const resultado = await NotificacaoRepository.marcarComoLida("inexistente", "usuario-1")

        expect(resultado).toBeNull()
        expect(delegate.findUnique).not.toHaveBeenCalled()
    })

    test("marca todas as notificações não lidas do usuário", async () => {
        const { delegate } = criarContexto()

        delegate.updateMany.mockResolvedValue({ count: 4 })

        const resultado = await NotificacaoRepository.marcarTodasComoLidas("usuario-1")

        expect(delegate.updateMany).toHaveBeenCalledWith({
            where: {
                usuario_id: "usuario-1",
                lida: false
            },
            data: { lida: true }
        })

        expect(resultado).toEqual({ matchedCount: 4, modifiedCount: 4 })
    })

})
