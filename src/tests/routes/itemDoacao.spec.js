import express from "express";
import request from "supertest";
import { beforeAll, beforeEach, describe, expect, jest, test } from "@jest/globals";
import CustomError from "../../utils/helpers/CustomError.js";
import errorHandler from "../../utils/helpers/errorHandler.js";
import {
    createRegularUser,
    createTestBearer,
    testIds,
} from "../test.js";

const mockCancelarItem = jest.fn();
const mockListarInteresses = jest.fn();
const mockUsuarioRepositoryBuscarPorId = jest.fn();

jest.mock("../../services/ItemDoacaoService.js", () => {
    return jest.fn().mockImplementation(() => {
        return {
            cancelarItem: mockCancelarItem, // Mapeado exatamente como o controller chama
            listarInteresses: mockListarInteresses,
        };
    });
});

jest.mock("../../repositories/UsuarioRepository.js", () => ({
    __esModule: true,
    default: class MockUsuarioRepository {
        buscarPorId(...args) {
            return mockUsuarioRepositoryBuscarPorId(...args);
        }
    },
}));

let appUsuario;

const bearer = (user = createRegularUser({ id: testIds.usuario })) =>
    createTestBearer(user);

beforeAll(async () => {
    const { default: itemDoacaoRoutes } = await import("../../routes/itemDoacaoRoutes.js");

    appUsuario = express();
    appUsuario.use(express.json());
    appUsuario.use(itemDoacaoRoutes);
    appUsuario.use(errorHandler);
});

beforeEach(() => {
    mockCancelarItem.mockReset();
    mockListarInteresses.mockReset();
    mockUsuarioRepositoryBuscarPorId.mockReset();
    mockUsuarioRepositoryBuscarPorId.mockImplementation(async (id) => ({
        _id: id,
        perfil: "USUARIO",
        situacao: "ATIVO",
    }));
});

describe("Rotas de Interação de Itens de Doação", () => {

    describe("PATCH /itens/:id/cancelar — cancelarItem", () => {
        test("retorna 200 com item cancelado com sucesso", async () => {
            const itemCanceladoPayload = {
                _id: testIds.item,
                titulo: "Monitor LG 24 Polegadas IPS",
                status: "CANCELADO",
            };

            mockCancelarItem.mockResolvedValue(itemCanceladoPayload);

            const res = await request(appUsuario)
                .patch(`/itens/${testIds.item}/cancelar`)
                .set("Authorization", bearer())
                .send({
                    motivo: "O item sofreu uma avaria durante a mudança e quebrou.",
                });

            expect(res.statusCode).toBe(200);
            expect(res.body.data.status).toBe("CANCELADO");
        });

        test("retorna 403 se usuário não tiver permissão", async () => {
            mockCancelarItem.mockRejectedValue(
                new CustomError({
                    statusCode: 403,
                    customMessage: "Você não tem permissão para cancelar este item.",
                })
            );

            const res = await request(appUsuario)
                .patch(`/itens/${testIds.item}/cancelar`)
                .set("Authorization", bearer())
                .send({
                    motivo: "Motivo de cancelamento válido com mais de dez caracteres.",
                });

            expect(res.statusCode).toBe(403);
            expect(res.body.message).toBe("Você não tem permissão para cancelar este item.");
        });

        test("retorna 400 se o motivo enviado falhar no validador do Zod", async () => {
            const res = await request(appUsuario)
                .patch(`/itens/${testIds.item}/cancelar`)
                .set("Authorization", bearer())
                .send({
                    motivo: "Curto",
                });

            expect(res.statusCode).toBe(400);
        });
    });

    describe("GET /itens/:id/interesses — listarInteresses", () => {
        test("retorna 200 com a lista de interessados", async () => {
            const listaInteressadosPayload = [
                {
                    _id: "6a007304412c0fa4e31e9eb8",
                    item_id: testIds.item,
                    status: "PENDENTE",
                    mensagem_interessado: "Gostaria muito do item para a faculdade.",
                },
            ];

            mockListarInteresses.mockResolvedValue(listaInteressadosPayload);

            const res = await request(appUsuario)
                .get(`/itens/${testIds.item}/interesses`)
                .set("Authorization", bearer());

            expect(res.statusCode).toBe(200);
            expect(Array.isArray(res.body.data)).toBe(true);
        });

        test("retorna 404 se o item de doação não existir no banco", async () => {
            mockListarInteresses.mockRejectedValue(
                new CustomError({
                    statusCode: 404,
                    customMessage: "Item não encontrado.",
                })
            );

            const res = await request(appUsuario)
                .get(`/itens/${testIds.item}/interesses`)
                .set("Authorization", bearer());

            expect(res.statusCode).toBe(404);
            expect(res.body.message).toBe("Item não encontrado.");
        });

        test("rejeita usuario suspenso antes de consultar os interessados", async () => {
            mockUsuarioRepositoryBuscarPorId.mockResolvedValue({
                _id: testIds.usuario,
                perfil: "USUARIO",
                situacao: "SUSPENSO",
            });

            const res = await request(appUsuario)
                .get(`/itens/${testIds.item}/interesses`)
                .set("Authorization", bearer());

            expect(res.statusCode).toBe(403);
            expect(mockListarInteresses).not.toHaveBeenCalled();
        });
    });
});
