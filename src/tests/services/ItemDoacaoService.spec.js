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
    });
});
