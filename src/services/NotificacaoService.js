import NotificacaoRepository from '../repositories/NotificacaoRepository.js';
import { CustomError } from "../utils/helpers/index.js";

class NotificacaoService {
    constructor(repository) {

        this.repository = repository;
    }

    criarNotificacao = async (dados) => {
        return await this.repository.criar(dados);
    }

    listar = async (usuarioId, page = 1, limit = 20) => {
        return await this.repository.listarDoUsuario(usuarioId, { page, limit });
    }

    contarNaoLidas = async (usuarioId) => {
        const total = await this.repository.contarNaoLidas(usuarioId);
        return { nao_lidas: total };
    }

    marcarComoLida = async (notificacaoId, usuarioId) => {
        const notificacao = await this.repository.marcarComoLida(notificacaoId, usuarioId);

        if(!notificacao) {
            throw new CustomError({
                statusCode: 404,
                customMessage: "Notificacao não encontrada ou não pertence a este usuário."
            });
        }
        return notificacao;
    }

    marcarTodasComoLidas = async (usuarioId) => {
        await this.repository.marcarTodasComoLidas(usuarioId);
        return { mensagem: "Marcado como Lidas" };
    }
}

export default new NotificacaoService(NotificacaoRepository);
