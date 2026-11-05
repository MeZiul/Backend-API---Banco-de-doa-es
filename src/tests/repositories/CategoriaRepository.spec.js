import { beforeEach, describe, expect, jest, test } from "@jest/globals";
import CategoriaRepository from "../../repositories/CategoriaRepository.js";

function criarRepositorio() {
    const delegate = { findUnique: jest.fn() }
    const repository = new CategoriaRepository()

    Object.defineProperty(repository, "client", {
        configurable: true,
        value: { categoria: delegate }
    })

    return { repository, delegate }
}

describe("CategoriaRepository", () => {
    beforeEach(() => { jest.clearAllMocks() })

    test("inicializa com o delegate categoria", () => {
        const { repository, delegate } = criarRepositorio()

        expect(repository.delegateName).toBe("categoria")
        expect(repository.delegate).toBe(delegate)
    })

    test("remove espaços do nome ao normalizar dados", () => {
        const { repository } = criarRepositorio()
        const resultado = repository.normalizeData({
            _id: "ignorado",
            nome: "  Alimentos  ",
            ativo: true
        })

        expect(resultado).toEqual({
            nome: "Alimentos",
            ativo: true
        })
    })

    test("mantém nome quando não é uma string", () => {
        const { repository } = criarRepositorio()

        expect(repository.normalizeData({ nome: null, ativo: false })
        ).toEqual({ nome: null, ativo: false })

        expect(repository.normalizeData({ ativo: true })
        ).toEqual({ ativo: true })
    })

    test("busca categoria por nome removendo espaços", async () => {
        const { repository, delegate } = criarRepositorio()

        delegate.findUnique.mockResolvedValue({
            id: "categoria-1",
            nome: "Alimentos",
            ativo: true
        })

        const resultado = await repository.buscarPorNome("  Alimentos  ")

        expect(delegate.findUnique).toHaveBeenCalledWith({ where: { nome: "Alimentos" } })

        expect(resultado).toMatchObject({ _id: "categoria-1", nome: "Alimentos", ativo: true })
    })

    test("converte valores recebidos na busca para string", async () => {
        const { repository, delegate } = criarRepositorio()

        delegate.findUnique.mockResolvedValue(null)

        const resultado = await repository.buscarPorNome(123)

        expect(delegate.findUnique).toHaveBeenCalledWith({ where: { nome: "123" } })

        expect(resultado).toBeNull()
    })

    test("propaga erros durante a busca por nome", async () => {
        const { repository, delegate } = criarRepositorio()
        const erro = new Error("Falha na consulta")

        delegate.findUnique.mockRejectedValue(erro)

        await expect(repository.buscarPorNome("Alimentos")
        ).rejects.toBe(erro)
    })

    test("lista categorias com filtros e paginação", async () => {
        const { repository } = criarRepositorio()
        const listar = jest.spyOn(repository, "listarComPaginacao"
        ).mockResolvedValue({ docs: [], totalDocs: 0 })

        const resultado = await repository.listar({
            filtros: {
                nome: "Alimento",
                ativo: "true"
            },
            page: 2,
            limit: 10
        })

        expect(listar).toHaveBeenCalledWith({
            nome: {
                $regex: "Alimento",
                $options: "i"
            },
            ativo: true
        }, {
            page: 2,
            limit: 10,
            sort: { ordem: 1 }
        }
        )

        expect(resultado).toEqual({ docs: [], totalDocs: 0 })
    })

    test.each([
        ["false", false, { ativo: false }],
        ["true", true, { ativo: true }],
    ])("filtra categorias com valor ativo %s", async (_, ativo, esperado) => {
        const { repository } = criarRepositorio()
        const listar = jest.spyOn(repository, "listarComPaginacao"
        ).mockResolvedValue({ docs: [] })

        await repository.listar({ filtros: { ativo } })

        expect(listar).toHaveBeenCalledWith(
            esperado,
            expect.objectContaining({ sort: { ordem: 1 } })
        )
    })

    test("ignora valores inválidos do filtro ativo", async () => {
        const { repository } = criarRepositorio()
        const listar = jest.spyOn(repository, "listarComPaginacao"
        ).mockResolvedValue({ docs: [] })

        await repository.listar({ filtros: { ativo: "invalido" } })

        expect(listar).toHaveBeenCalledWith({}, expect.any(Object))
    })
})
