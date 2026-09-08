import { beforeEach, describe, expect, jest, test } from "@jest/globals";
import NotificacaoService from "../../services/NotificacaoService.js";
import NotificacaoRepository from "../../repositories/NotificacaoRepository.js";
import CustomError from "../../utils/helpers/CustomError.js";

// Mockamos o repositório que o serviço injeta automaticamente
jest.mock("../../repositories/NotificacaoRepository.js", () => ({
    criar: jest.fn(),
    criarMuitas: jest.fn(),
    listarDoUsuario: jest.fn(),
    contarNaoLidas: jest.fn(),
    marcarComoLida: jest.fn(),
    marcarTodasComoLidas: jest.fn(),
}));

describe("NotificacaoService", () => {

    beforeEach(() => {
        jest.clearAllMocks();
    });

    test("listar deve chamar repository corretamente", async () => {
        NotificacaoRepository.listarDoUsuario.mockResolvedValue({ docs: [] });
        await NotificacaoService.listar("user123");
        expect(NotificacaoRepository.listarDoUsuario).toHaveBeenCalledWith("user123", { page: 1, limit: 20 });
    });

    test("criarNotificacoes deve ignorar destinatários ausentes e persistir em lote", async () => {
        const notificacoes = [
            { usuario_id: "user123", tipo: "SISTEMA" },
            { usuario_id: null, tipo: "SISTEMA" },
        ];
        NotificacaoRepository.criarMuitas.mockResolvedValue([notificacoes[0]]);

        const resultado = await NotificacaoService.criarNotificacoes(notificacoes);

        expect(NotificacaoRepository.criarMuitas).toHaveBeenCalledWith([notificacoes[0]]);
        expect(resultado).toEqual([notificacoes[0]]);
    });

    test("criarNotificacoesComSeguranca não deve propagar falha do subsistema", async () => {
        NotificacaoRepository.criarMuitas.mockRejectedValue(new Error("banco indisponível"));

        await expect(
            NotificacaoService.criarNotificacoesComSeguranca([
                { usuario_id: "user123", tipo: "SISTEMA" },
            ])
        ).resolves.toEqual([]);
    });

    test("contarNaoLidas deve retornar formato esperado", async () => {
        NotificacaoRepository.contarNaoLidas.mockResolvedValue(5);
        const res = await NotificacaoService.contarNaoLidas("user123");
        expect(res).toEqual({ nao_lidas: 5 });
    });

    test("marcarComoLida deve lancar 404 se nao encontrar notificacao", async () => {
        NotificacaoRepository.marcarComoLida.mockResolvedValue(null);
        await expect(NotificacaoService.marcarComoLida("notif1", "user123"))
            .rejects.toMatchObject({ statusCode: 404 });
    });

    test("marcarTodasComoLidas deve retornar mensagem de sucesso", async () => {
        NotificacaoRepository.marcarTodasComoLidas.mockResolvedValue({});
        const res = await NotificacaoService.marcarTodasComoLidas("user123");
        expect(res.mensagem).toBe("Marcado como Lidas");
        expect(NotificacaoRepository.marcarTodasComoLidas).toHaveBeenCalledWith("user123");
    });
});
