import Notificacao from '../model/Notificacao.js';
import BaseRepository from '../repositories/BaseRepository.js';

class NotificacaoRepository extends BaseRepository {
    constructor() {
        super(Notificacao);
    }

    //Lista as notificações de um usuário e ordena sempre da mais recente
    listarDoUsuarios(usuarioId, options = { page: 1, limit: 20 }) {
        const query = { usuario_id: usuarioId };

        return this.listarComPaginacao(query, {
            ...options,
            sort: { data_criacao: -1 }
        });
    }

    //Retorna a quantidade de notificações que ainda não foram lidas
    contarNaoLidas(usuarioId) {
        return this.model.countDocuments({
            usuario_id: usuarioId,
            lida: false
        });
    }

    //Marca uma notificação especifica como lida
    marcarComoLida(notificacaoId, usuarioId) {
        return this.model.findOneAndUpdate(
            { _id: notificacaoId, usuario_id: usuarioId },
            { lida: true },
            { new: true }, //Retorna atualizado
        );
    }

    //Utilitário extra: marca todas as notificações
    marcarTodasComoLidas(usuarioId) {
        return this.model.updateMany(
            { usuario_id: usuarioId, lida: false },
            { lida: true },
        );
    }
}

export default new NotificacaoRepository();
