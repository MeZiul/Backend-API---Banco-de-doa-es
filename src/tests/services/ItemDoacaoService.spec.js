import { beforeEach, describe, expect, jest, test } from "@jest/globals";
import ItemDoacaoService from "../../services/ItemDoacaoService.js";
import CustomError from "../../utils/helpers/CustomError.js";

const mockItemRepository = {
    criar: jest.fn(),
    listarDisponiveis: jest.fn(),
    buscarPorId: jest.fn(),
    buscarDetalhes: jest.fn(),
    atualizar: jest.fn(),
    deletar: jest.fn(),
};

const mockCategoriaRepository = {};
const mockInteresseRepository = {
    listarPorItem: jest.fn(),
};

let service;

beforeEach(() => {
    jest.clearAllMocks();
    service = new ItemDoacaoService(
        mockItemRepository,
        mockCategoriaRepository,
        mockInteresseRepository
    );
});

describe("ItemDoacaoService", () => {

    describe("criar", () => {
        test("deve criar item com sucesso se usuario ativo", async () => {
            const usuario = { id: "u1", situacao: "ATIVO", cidade: "Vilhena", uf: "RO" };
            const dados = { titulo: "Livro", descricao: "Java", categoria_id: "c1", condicao_item: "Bom" };

            mockItemRepository.criar.mockResolvedValue({ _id: "i1", ...dados });

            const res = await service.criar(dados, usuario);
            expect(res._id).toBe("i1");
            expect(mockItemRepository.criar).toHaveBeenCalled();
        });

        test("deve lançar 403 se usuario inativo", async () => {
            const usuario = { situacao: "INATIVO" };
            await expect(service.criar({}, usuario)).rejects.toMatchObject({ statusCode: 403 });
        });

        test("deve lançar 400 se campos obrigatorios ausentes", async () => {
            const usuario = { id: "u1", situacao: "ATIVO" };
            await expect(service.criar({}, usuario)).rejects.toMatchObject({
                statusCode: 400,
                customMessage: "Título, descrição, categoria e condição do item são obrigatórios.",
            });
            expect(mockItemRepository.criar).not.toHaveBeenCalled();
        });

        test("deve usar cidade e uf do usuario se nao informados no item", async () => {
            const usuario = { id: "u1", situacao: "ATIVO", cidade: "Vilhena", uf: "RO" };
            const dados = { titulo: "Livro", descricao: "Java", categoria_id: "c1", condicao_item: "Bom" };

            mockItemRepository.criar.mockResolvedValue({ _id: "i1", cidade: "Vilhena", uf: "RO" });

            await service.criar(dados, usuario);

            expect(mockItemRepository.criar).toHaveBeenCalledWith(
                expect.objectContaining({ cidade: "Vilhena", uf: "RO", usuario_id: "u1", status: "DISPONIVEL" })
            );
        });

        test("deve usar cidade e uf do item se informados", async () => {
            const usuario = { id: "u1", situacao: "ATIVO", cidade: "Vilhena", uf: "RO" };
            const dados = { titulo: "Livro", descricao: "Java", categoria_id: "c1", condicao_item: "Bom", cidade: "Porto Velho", uf: "RO" };

            mockItemRepository.criar.mockResolvedValue({ _id: "i1", cidade: "Porto Velho", uf: "RO" });

            await service.criar(dados, usuario);

            expect(mockItemRepository.criar).toHaveBeenCalledWith(
                expect.objectContaining({ cidade: "Porto Velho", uf: "RO" })
            );
        });

        test("deve lançar 403 se usuario suspenso", async () => {
            const usuario = { situacao: "SUSPENSO" };
            await expect(service.criar({}, usuario)).rejects.toMatchObject({ statusCode: 403 });
            expect(mockItemRepository.criar).not.toHaveBeenCalled();
        });
    });

    describe("cancelarItem", () => {
        test("deve cancelar item se for o dono", async () => {
            const item = { _id: "i1", usuario_id: "u1", status: "DISPONIVEL" };
            mockItemRepository.buscarPorId.mockResolvedValue(item);
            mockItemRepository.atualizar.mockResolvedValue({ status: "CANCELADO" });

            const res = await service.cancelarItem("i1", "Motivo qualquer", { id: "u1" });
            expect(res.status).toBe("CANCELADO");
        });

        test("deve lançar 403 se tentar cancelar item de outro usuario", async () => {
            mockItemRepository.buscarPorId.mockResolvedValue({ usuario_id: "dono_original" });
            await expect(service.cancelarItem("i1", "motivo", { id: "intruso" })).rejects.toMatchObject({ statusCode: 403 });
        });

        test("deve lançar 404 se item nao encontrado ao cancelar", async () => {
            mockItemRepository.buscarPorId.mockResolvedValue(null);

            await expect(service.cancelarItem("i1", "motivo", { id: "u1" })).rejects.toMatchObject({
                statusCode: 404,
                customMessage: "Item não encontrado.",
            });
            expect(mockItemRepository.atualizar).not.toHaveBeenCalled();
        });

        test("deve lançar 400 se item já está CANCELADO", async () => {
            mockItemRepository.buscarPorId.mockResolvedValue({ usuario_id: "u1", status: "CANCELADO" });

            await expect(service.cancelarItem("i1", "motivo", { id: "u1" })).rejects.toMatchObject({
                statusCode: 400,
                customMessage: "Não é possível cancelar um item com status CANCELADO.",
            });
            expect(mockItemRepository.atualizar).not.toHaveBeenCalled();
        });

        test("deve lançar 400 se item já está DOADO", async () => {
            mockItemRepository.buscarPorId.mockResolvedValue({ usuario_id: "u1", status: "DOADO" });

            await expect(service.cancelarItem("i1", "motivo", { id: "u1" })).rejects.toMatchObject({
                statusCode: 400,
                customMessage: "Não é possível cancelar um item com status DOADO.",
            });
            expect(mockItemRepository.atualizar).not.toHaveBeenCalled();
        });

        test("deve permitir que ADMINISTRADOR cancele item de outro usuario", async () => {
            mockItemRepository.buscarPorId.mockResolvedValue({ usuario_id: "dono", status: "DISPONIVEL" });
            mockItemRepository.atualizar.mockResolvedValue({ status: "CANCELADO" });

            const res = await service.cancelarItem("i1", "motivo admin", { id: "admin", perfil: "ADMINISTRADOR" });
            expect(res.status).toBe("CANCELADO");
            expect(mockItemRepository.atualizar).toHaveBeenCalledWith("i1", expect.objectContaining({
                status: "CANCELADO",
                motivo_cancelamento: "motivo admin",
            }));
        });
    });

    describe("listarInteresses", () => {
        test("deve listar interessados se for o dono do item", async () => {
            mockItemRepository.buscarPorId.mockResolvedValue({ usuario_id: "dono" });
            mockInteresseRepository.listarPorItem.mockResolvedValue([{ usuario_id: "int1" }]);

            const res = await service.listarInteresses("i1", { id: "dono" });
            expect(res).toHaveLength(1);
        });

        test("deve impedir administrador que nao seja o dono de listar interessados", async () => {
            mockItemRepository.buscarPorId.mockResolvedValue({ usuario_id: "dono" });

            await expect(service.listarInteresses("i1", {
                id: "admin",
                perfil: "ADMINISTRADOR",
            })).rejects.toMatchObject({ statusCode: 403 });

            expect(mockInteresseRepository.listarPorItem).not.toHaveBeenCalled();
        });

        test("deve lançar 404 se item nao encontrado ao listar interesses", async () => {
            mockItemRepository.buscarPorId.mockResolvedValue(null);

            await expect(service.listarInteresses("i1", { id: "u1" })).rejects.toMatchObject({
                statusCode: 404,
                customMessage: "Item não encontrado.",
            });
            expect(mockInteresseRepository.listarPorItem).not.toHaveBeenCalled();
        });

        test("deve lançar 403 se usuario nao for o dono do item", async () => {
            mockItemRepository.buscarPorId.mockResolvedValue({ usuario_id: "dono" });

            await expect(service.listarInteresses("i1", { id: "outro" })).rejects.toMatchObject({
                statusCode: 403,
                customMessage: "Apenas o doador do item pode listar os interessados.",
            });
            expect(mockInteresseRepository.listarPorItem).not.toHaveBeenCalled();
        });
    });

    describe("confirmarEntrega", () => {
        test("deve atualizar status para AGUARDANDO_CONFIRMACAO", async () => {
            mockItemRepository.buscarPorId.mockResolvedValue({
                _id: "i1",
                usuario_id: "u1",
                status: "RESERVADO"
            });

            await service.confirmarEntrega("i1", "u1");
            expect(mockItemRepository.atualizar).toHaveBeenCalledWith("i1", expect.objectContaining({
                status: "AGUARDANDO_CONFIRMACAO"
            }));
        });

        test("deve lançar 404 se item nao encontrado ao confirmar entrega", async () => {
            mockItemRepository.buscarPorId.mockResolvedValue(null);

            await expect(service.confirmarEntrega("i1", "u1")).rejects.toMatchObject({
                statusCode: 404,
                customMessage: "Item não encontrado.",
            });
            expect(mockItemRepository.atualizar).not.toHaveBeenCalled();
        });

        test("deve lançar 403 se usuario nao for o doador ao confirmar entrega", async () => {
            mockItemRepository.buscarPorId.mockResolvedValue({ usuario_id: "dono", status: "RESERVADO" });

            await expect(service.confirmarEntrega("i1", "intruso")).rejects.toMatchObject({
                statusCode: 403,
                customMessage: "Apenas o doador pode marcar o item como entregue.",
            });
            expect(mockItemRepository.atualizar).not.toHaveBeenCalled();
        });

        test("deve lançar 400 se item nao está RESERVADO ao confirmar entrega", async () => {
            mockItemRepository.buscarPorId.mockResolvedValue({ usuario_id: "u1", status: "DISPONIVEL" });

            await expect(service.confirmarEntrega("i1", "u1")).rejects.toMatchObject({
                statusCode: 400,
                customMessage: "O item precisa estar reservado para ser marcado como entregue.",
            });
            expect(mockItemRepository.atualizar).not.toHaveBeenCalled();
        });
    });

    describe("confirmarRecebimento", () => {
        test("deve atualizar status para DOADO", async () => {
            mockItemRepository.buscarPorId.mockResolvedValue({
                _id: "i1",
                usuario_id: "u1",
                status: "AGUARDANDO_CONFIRMACAO",
                interesse_aceito_id: {
                    _id: "interesse1",
                    usuario_interessado_id: "interessado1",
                },
            });
            mockItemRepository.atualizar.mockResolvedValue({ status: "DOADO" });

            const res = await service.confirmarRecebimento("i1", "interessado1");
            expect(mockItemRepository.buscarPorId).toHaveBeenCalledWith("i1", {
                populate: [
                    {
                        path: "interesse_aceito_id",
                        select: "usuario_interessado_id",
                    },
                ],
            });
            expect(mockItemRepository.atualizar).toHaveBeenCalledWith("i1", expect.objectContaining({
                status: "DOADO",
            }));
            expect(res.status).toBe("DOADO");
        });

        test("deve lançar 404 se item nao encontrado ao confirmar recebimento", async () => {
            mockItemRepository.buscarPorId.mockResolvedValue(null);

            await expect(service.confirmarRecebimento("i1", "u1")).rejects.toMatchObject({
                statusCode: 404,
                customMessage: "Item não encontrado.",
            });
            expect(mockItemRepository.atualizar).not.toHaveBeenCalled();
        });

        test("deve lançar 400 se item nao está AGUARDANDO_CONFIRMACAO", async () => {
            mockItemRepository.buscarPorId.mockResolvedValue({
                usuario_id: "u1",
                status: "RESERVADO",
                interesse_aceito_id: {
                    _id: "interesse1",
                    usuario_interessado_id: "u1",
                },
            });

            await expect(service.confirmarRecebimento("i1", "u1")).rejects.toMatchObject({
                statusCode: 400,
                customMessage: "Este item não está aguardando confirmação de recebimento.",
            });
            expect(mockItemRepository.atualizar).not.toHaveBeenCalled();
        });

        test("deve lançar 403 se usuario nao for o interessado aceito", async () => {
            mockItemRepository.buscarPorId.mockResolvedValue({
                usuario_id: "doador1",
                status: "AGUARDANDO_CONFIRMACAO",
                interesse_aceito_id: {
                    _id: "interesse1",
                    usuario_interessado_id: "interessado1",
                },
            });

            await expect(
                service.confirmarRecebimento("i1", "outroUsuario")
            ).rejects.toMatchObject({
                statusCode: 403,
                customMessage: "Você não tem permissão para confirmar o recebimento deste item.",
            });
            expect(mockItemRepository.atualizar).not.toHaveBeenCalled();
        });
    });

    describe("buscarDetalhes", () => {
        test("deve retornar item quando encontrado", async () => {
            const item = { _id: "i1", titulo: "Livro" };
            mockItemRepository.buscarDetalhes.mockResolvedValue(item);

            const res = await service.buscarDetalhes("i1");
            expect(res).toEqual(item);
            expect(mockItemRepository.buscarDetalhes).toHaveBeenCalledWith("i1");
        });

        test("deve lançar 404 se item nao encontrado", async () => {
            mockItemRepository.buscarDetalhes.mockResolvedValue(null);

            await expect(service.buscarDetalhes("i1")).rejects.toMatchObject({
                statusCode: 404,
                customMessage: "Item não encontrado.",
            });
        });
    });

    describe("atualizar", () => {
        test("deve atualizar item com sucesso se for o dono e status DISPONIVEL", async () => {
            mockItemRepository.buscarPorId.mockResolvedValue({ usuario_id: "u1", status: "DISPONIVEL" });
            mockItemRepository.atualizar.mockResolvedValue({ _id: "i1", titulo: "Novo titulo" });

            const res = await service.atualizar("i1", { titulo: "Novo titulo" }, "u1");
            expect(res.titulo).toBe("Novo titulo");
            expect(mockItemRepository.atualizar).toHaveBeenCalled();
        });

        test("deve lançar 404 se item nao encontrado ao atualizar", async () => {
            mockItemRepository.buscarPorId.mockResolvedValue(null);

            await expect(service.atualizar("i1", { titulo: "x" }, "u1")).rejects.toMatchObject({
                statusCode: 404,
                customMessage: "Item não encontrado.",
            });
            expect(mockItemRepository.atualizar).not.toHaveBeenCalled();
        });

        test("deve lançar 403 se usuario nao for o dono ao atualizar", async () => {
            mockItemRepository.buscarPorId.mockResolvedValue({ usuario_id: "dono", status: "DISPONIVEL" });

            await expect(service.atualizar("i1", { titulo: "x" }, "intruso")).rejects.toMatchObject({
                statusCode: 403,
                customMessage: "Você não tem permissão para editar este item.",
            });
            expect(mockItemRepository.atualizar).not.toHaveBeenCalled();
        });

        test("deve lançar 400 se item nao está DISPONIVEL ao atualizar", async () => {
            mockItemRepository.buscarPorId.mockResolvedValue({ usuario_id: "u1", status: "RESERVADO" });

            await expect(service.atualizar("i1", { titulo: "x" }, "u1")).rejects.toMatchObject({
                statusCode: 400,
                customMessage: "Edição bloqueada. O status atual do item é RESERVADO.",
            });
            expect(mockItemRepository.atualizar).not.toHaveBeenCalled();
        });

        test("deve ignorar campos sensiveis na atualizacao", async () => {
            mockItemRepository.buscarPorId.mockResolvedValue({ usuario_id: "u1", status: "DISPONIVEL" });
            mockItemRepository.atualizar.mockResolvedValue({ _id: "i1" });

            const dados = { titulo: "Novo", status: "DOADO", usuario_id: "hacker", interesse_aceito_id: "x" };
            await service.atualizar("i1", dados, "u1");

            expect(mockItemRepository.atualizar).toHaveBeenCalledWith("i1", expect.not.objectContaining({
                status: "DOADO",
                usuario_id: "hacker",
                interesse_aceito_id: "x",
            }));
        });
    });

        describe("deletar", () => {
        test("deve cancelar item com sucesso se for o dono, sem removê-lo", async () => {
            mockItemRepository.buscarPorId.mockResolvedValue({ usuario_id: "u1", status: "DISPONIVEL" });
            mockItemRepository.atualizar.mockResolvedValue({ _id: "i1", status: "CANCELADO" });

            const res = await service.deletar("i1", "u1");
            expect(res.status).toBe("CANCELADO");
            expect(mockItemRepository.atualizar).toHaveBeenCalledWith("i1", { status: "CANCELADO" });
            expect(mockItemRepository.deletar).not.toHaveBeenCalled();
        });

        test("deve lançar 404 se item nao encontrado ao deletar", async () => {
            mockItemRepository.buscarPorId.mockResolvedValue(null);

            await expect(service.deletar("i1", "u1")).rejects.toMatchObject({
                statusCode: 404,
                customMessage: "Item não encontrado.",
            });
            expect(mockItemRepository.atualizar).not.toHaveBeenCalled();
        });

        test("deve lançar 403 se usuario nao for o dono ao deletar", async () => {
            mockItemRepository.buscarPorId.mockResolvedValue({ usuario_id: "dono", status: "DISPONIVEL" });

            await expect(service.deletar("i1", "intruso")).rejects.toMatchObject({
                statusCode: 403,
                customMessage: "Você não tem permissão para excluir este item.",
            });
            expect(mockItemRepository.atualizar).not.toHaveBeenCalled();
        });

        test("deve lançar 400 se item está RESERVADO ao deletar", async () => {
            mockItemRepository.buscarPorId.mockResolvedValue({ usuario_id: "u1", status: "RESERVADO" });

            await expect(service.deletar("i1", "u1")).rejects.toMatchObject({
                statusCode: 400,
                customMessage: "Não é possível excluir um item que está em processo de doação.",
            });
            expect(mockItemRepository.atualizar).not.toHaveBeenCalled();
        });

        test("deve lançar 400 se item está AGUARDANDO_CONFIRMACAO ao deletar", async () => {
            mockItemRepository.buscarPorId.mockResolvedValue({ usuario_id: "u1", status: "AGUARDANDO_CONFIRMACAO" });

            await expect(service.deletar("i1", "u1")).rejects.toMatchObject({
                statusCode: 400,
                customMessage: "Não é possível excluir um item que está em processo de doação.",
            });
            expect(mockItemRepository.atualizar).not.toHaveBeenCalled();
        });
    });

    describe("listarDisponiveis", () => {
        test("deve listar itens disponiveis com filtros e paginacao", async () => {
            const mockResultado = { docs: [{ _id: "i1" }], total: 1 };
            mockItemRepository.listarDisponiveis.mockResolvedValue(mockResultado);

            const res = await service.listarDisponiveis({ filtros: { uf: "RO" }, page: 1, limit: 10, ordenacao: "recente" });
            expect(mockItemRepository.listarDisponiveis).toHaveBeenCalledWith(
                expect.objectContaining({ filtros: { uf: "RO" }, page: 1, limit: 10 })
            );
            expect(res).toEqual(mockResultado);
        });
    });
});
