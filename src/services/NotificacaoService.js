import NotificacaoRepository from '../repositories/NotificacaoRepository.js';
import { CustomError } from "../utils/helpers/index.js";

class NotificacaoService {
    constructor(repository) {
        this.respository = repository
    }

    //Método será chamado pelo outros serviços
    async criarNotificacao(dados) {
        //confiar nos dados passados pelos outros sitemas
        return await this.respository.criar(dados)
    }

    //listar notificações do usuário logado
    async listar(usuarioId, page = 1, limit = 20) {
        return await this.respository.listarDoUsuario(usuarioId, {page, limit});
    }

    //Retorna o total de notificações não lidas
    async contarNaoLidas(usuarioId) {
        const total = await this.respository.contarNaoLidas(usuarioId);
        return { nao_lidas: total };
    }

    //Marca notificação específica lida
    async marcarComoLida(notificacaoId, usuarioId) {
        const notificacao = await this.respository.marcarComoLida(notificacaoId, usuarioId);

        if(!notificacao) {
            throw new CustomError({
                statusCode: 404,
                customMessage: "Notificacao não encontrada ou não pertence a este usuário."
            });
        }
        return notificacao;
    }

    //utilitário para o botão "Marcar todas como lida"
    async marcarTodasComoLidas(usuarioId) {
        await this.respository.marcarTodasComoLidas(usuarioId);
        return { mensagem: "Marcado como Lidas" };
    }
}

export default new NotificacaoService(NotificacaoRepository);