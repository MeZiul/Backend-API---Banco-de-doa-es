import { describe, expect, jest, test, beforeEach } from "@jest/globals";
import BaseRepository from "../../repositories/base/BaseRepository.js";
import { runInTransaction } from "../../config/prisma.js";

function criarRepositorio(options = {}) {
    const delegate = {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn()
    };

    const client = {
        usuario: delegate,
        $transaction: jest.fn(async (callback) => callback(client))
    };

    const repository = new BaseRepository("usuario", options);

    Object.defineProperty(repository, "client", {
        value: client,
        configurable: true
    });

    return { repository, delegate, client };
}

describe("BaseRepository", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    test("inicializa configurações e acessa o delegate", () => {
        const { repository, delegate } = criarRepositorio();

        expect(repository.delegateName).toBe("usuario");
        expect(repository.delegate).toBe(delegate);
        expect(repository.model).toBe(delegate);
        expect(repository.relationMap).toEqual({});
        expect(repository.defaultInclude).toBeUndefined();
        expect(repository.includeHidden).toBe(false);
    });

    test("remove campos legados dos dados", () => {
        const { repository } = criarRepositorio();

        expect(repository.normalizeData({
            _id: "antigo",
            id: "interno",
            nome: "Teste",
            createdAt: new Date(),
            updatedAt: new Date(),
            data_cadastro: new Date(),
            data_atualizacao: new Date()
        })
        ).toEqual({ nome: "Teste" });
    });

    test("mantém o filtro recebido", () => {
        const { repository } = criarRepositorio();
        const filtro = { situacao: "ATIVO" };

        expect(repository.transformWhere(filtro)).toBe(filtro);
    });

    test("converte registros para o formato legado", () => {
        const { repository } = criarRepositorio();

        const resultado = repository.mapRecord({
            id: "123",
            nome: "Teste",
            senha: "secreta"
        });

        expect(resultado).toMatchObject({
            _id: "123",
            nome: "Teste"
        });
        expect(resultado.senha).toBeUndefined();
    });

    test("permite incluir campos ocultos", () => {
        const { repository } = criarRepositorio({
            includeHidden: true
        });

        const resultado = repository.mapRecord({
            id: "123",
            senha: "secreta"
        });

        expect(resultado.senha).toBe("secreta");
    });

    test("combina includes e trata ausência deles", () => {
        const { repository } = criarRepositorio({
            defaultInclude: { perfil: true }
        });

        expect(repository.mergeInclude({ cidade: true })).toEqual({
            perfil: true,
            cidade: true
        });

        expect(repository.mergeInclude()).toEqual({ perfil: true });

        const outro = criarRepositorio().repository;

        expect(outro.mergeInclude()).toBeUndefined();

        expect(outro.mergeInclude({ perfil: true })).toEqual({ perfil: true });
    });

    test("busca por ID e retorna documento legado", async () => {
        const { repository, delegate } = criarRepositorio();

        delegate.findUnique.mockResolvedValue({
            id: "123",
            nome: "Maria"
        });

        const resultado = await repository.buscarPorId(123);

        expect(delegate.findUnique).toHaveBeenCalledWith({
            where: { id: "123" }
        });

        expect(resultado).toMatchObject({
            _id: "123",
            nome: "Maria"
        });
    });

    test("busca com populate, select e includeHidden", async () => {
        const { repository, delegate } = criarRepositorio({
            relationMap: { perfil: "perfilUsuario" }
        });

        delegate.findUnique.mockResolvedValue({
            id: "123",
            nome: "Maria",
            senha: "secreta",
            perfilUsuario: { id: "456", nome: "Doador" }
        });

        const resultado = await repository.buscarPorId("123", {
            populate: "perfil",
            select: "nome perfil",
            includeHidden: true
        });

        expect(delegate.findUnique).toHaveBeenCalledWith({
            where: { id: "123" },
            include: { perfilUsuario: true }
        });

        expect(resultado).toMatchObject({
            _id: "123",
            nome: "Maria",
            perfil: { _id: "456", nome: "Doador" }
        });
        expect(resultado.senha).toBeUndefined();
    });

    test("retorna null quando o registro não existe", async () => {
        const { repository, delegate } = criarRepositorio();

        delegate.findUnique.mockResolvedValue(null);

        await expect(repository.buscarPorId("404")).resolves.toBeNull();
    });

    test("cria registro removendo campos legados", async () => {
        const { repository, delegate } = criarRepositorio({
            defaultInclude: { perfil: true }
        });

        delegate.create.mockResolvedValue({
            id: "123",
            nome: "Maria"
        });

        const resultado = await repository.criar({
            _id: "ignorado",
            nome: "Maria"
        });

        expect(delegate.create).toHaveBeenCalledWith({
            data: { nome: "Maria" },
            include: { perfil: true }
        });

        expect(resultado._id).toBe("123");
    });

    test("converte erro de unicidade durante criação", async () => {
        const { repository, delegate } = criarRepositorio();

        delegate.create.mockRejectedValue(
            Object.assign(new Error("Duplicado"), {
                code: "P2002",
                meta: { target: ["email"] }
            }),
        );

        await expect(repository.criar({ email: "teste@example.com" })
        ).rejects.toMatchObject({
            code: 11000
        });
    });


    test("atualiza registro utilizando defaultInclude", async () => {
        const { repository, delegate } = criarRepositorio({
            defaultInclude: { perfil: true },
        });

        delegate.update.mockResolvedValue({
            id: "123",
            nome: "Atualizado",
        });

        const resultado = await repository.atualizar("123", {
            nome: "Atualizado",
        });

        expect(delegate.update).toHaveBeenCalledWith({
            where: { id: "123" },
            data: { nome: "Atualizado" },
            include: { perfil: true },
        });

        expect(resultado).toMatchObject({
            _id: "123",
            nome: "Atualizado",
        });
    });

    test("exclui registro utilizando defaultInclude", async () => {
        const { repository, delegate } = criarRepositorio({
            defaultInclude: { perfil: true },
        });

        delegate.findUnique.mockResolvedValue({
            id: "123",
            nome: "Maria",
        });

        delegate.delete.mockResolvedValue({
            id: "123",
        });

        const resultado = await repository.deletar("123");

        expect(delegate.findUnique).toHaveBeenCalledWith({
            where: { id: "123" },
            include: { perfil: true },
        });

        expect(delegate.delete).toHaveBeenCalledWith({
            where: { id: "123" },
        });

        expect(resultado._id).toBe("123");
    });

    test("lista registros sem informar filtro ou opções", async () => {
        const { repository, delegate } = criarRepositorio();

        delegate.findMany.mockResolvedValue([]);
        delegate.count.mockResolvedValue(0);

        const resultado = await repository.listarComPaginacao();

        expect(delegate.findMany).toHaveBeenCalledWith({
            where: {},
            skip: 0,
            take: 15,
        });

        expect(delegate.count).toHaveBeenCalledWith({
            where: {},
        });

        expect(resultado).toMatchObject({
            docs: [],
            totalDocs: 0,
            page: 1,
            limit: 15,
        });
    });

    test("retorna null quando atualização recebe P2025", async () => {
        const { repository, delegate } = criarRepositorio();

        delegate.update.mockRejectedValue(
            Object.assign(new Error("Não encontrado"), {
                code: "P2025"
            }),
        );

        await expect(
            repository.atualizar("404", { nome: "Teste" })
        ).resolves.toBeNull();
    });

    test("propaga outros erros na atualização", async () => {
        const { repository, delegate } = criarRepositorio();
        const erro = new Error("Falha de conexão");

        delegate.update.mockRejectedValue(erro);

        await expect(repository.atualizar("123", { nome: "Teste" })
        ).rejects.toBe(erro);
    });

    test("retorna null ao excluir registro inexistente", async () => {
        const { repository, delegate } = criarRepositorio();

        delegate.findUnique.mockResolvedValue(null);

        await expect(repository.deletar("404")).resolves.toBeNull();

        expect(delegate.delete).not.toHaveBeenCalled();
    });

    test("retorna null se registro desaparecer durante exclusão", async () => {
        const { repository, delegate } = criarRepositorio();

        delegate.findUnique.mockResolvedValue({ id: "123" });
        delegate.delete.mockRejectedValue(
            Object.assign(new Error("Não encontrado"), {
                code: "P2025"
            }),
        );

        await expect(repository.deletar("123")).resolves.toBeNull();
    });

    test("propaga outros erros de exclusão", async () => {
        const { repository, delegate } = criarRepositorio();
        const erro = new Error("Banco indisponível");

        delegate.findUnique.mockResolvedValue({ id: "123" });
        delegate.delete.mockRejectedValue(erro);

        await expect(repository.deletar("123")).rejects.toBe(erro);
    });

    test("lista registros com paginação e ordenação", async () => {
        const { repository, delegate } = criarRepositorio();

        delegate.findMany.mockResolvedValue([
            { id: "1", nome: "Maria" },
            { id: "2", nome: "João" }
        ]);
        delegate.count.mockResolvedValue(5);

        const resultado = await repository.listarComPaginacao(
            { situacao: "ATIVO" },
            { page: 2, limit: 2, sort: { nome: 1 } }
        );

        expect(delegate.findMany).toHaveBeenCalledWith({
            where: { situacao: "ATIVO" },
            skip: 2,
            take: 2,
            orderBy: [{ nome: "asc" }]
        });

        expect(resultado).toMatchObject({
            totalDocs: 5,
            totalPages: 3,
            page: 2,
            limit: 2,
            hasPrevPage: true,
            hasNextPage: true
        });

        expect(resultado.docs).toHaveLength(2);
        expect(resultado.docs[0]._id).toBe("1");
    });

    test("aplica valores padrão para paginação inválida", async () => {
        const { repository, delegate } = criarRepositorio();

        delegate.findMany.mockResolvedValue([]);
        delegate.count.mockResolvedValue(0);

        const resultado = await repository.listarComPaginacao({}, { page: 0, limit: 0 });

        expect(delegate.findMany).toHaveBeenCalledWith({
            where: {},
            skip: 0,
            take: 15
        });

        expect(resultado.page).toBe(1);
        expect(resultado.limit).toBe(15);
        expect(resultado.docs).toEqual([]);
    });

    test("combina includes na listagem", async () => {
        const { repository, delegate } = criarRepositorio({
            defaultInclude: { fotos: true },
            relationMap: { perfil: "perfilUsuario" }
        });

        delegate.findMany.mockResolvedValue([]);
        delegate.count.mockResolvedValue(0);

        await repository.listarComPaginacao(
            {},
            {
                populate: "perfil",
                include: { cidade: true }
            }
        );

        expect(delegate.findMany).toHaveBeenCalledWith(
            expect.objectContaining({
                include: {
                    fotos: true,
                    perfilUsuario: true,
                    cidade: true
                }
            })
        )
    });

    test("obtém o cliente Prisma do contexto de transação", async () => {
        const repository = new BaseRepository("usuario");
        const transactionClient = { usuario: { findUnique: jest.fn() } };
        const client = { $transaction: jest.fn(async (callback) => callback(transactionClient)) };

        await runInTransaction(async () => {
            expect(repository.client).toBe(transactionClient);
            expect(repository.delegate).toBe(transactionClient.usuario);
        }, { client });

        expect(client.$transaction).toHaveBeenCalledTimes(1);
    });

    test("executa operação dentro de uma transação", async () => {
        const { repository, client } = criarRepositorio();
        const operation = jest.fn(async (tx) => {
            expect(tx).toBe(client);
            return { sucesso: true };
        });
        const resultado = await repository.withTransaction(operation);

        expect(resultado).toEqual({ sucesso: true });
        expect(operation).toHaveBeenCalledTimes(1);
        expect(client.$transaction).toHaveBeenCalledTimes(1);
    });

});
