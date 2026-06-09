import Notificacao from '../models/Notificacao.js';
import BaseRepository from './base/BaseRepository.js';

class NotificacaoRepository extends BaseRepository {
    constructor() {
        super(Notificacao);
    }

    listarDoUsuario(usuarioId, options = { page: 1, limit: 20 }) {
        const query = { usuario_id: usuarioId };

        return this.listarComPaginacao(query, {
            ...options,
            sort: { data_criacao: -1 }
        });
    }

    contarNaoLidas(usuarioId) {
        return this.model.countDocuments({
            usuario_id: usuarioId,
            lida: false
        });
    }

    marcarComoLida(notificacaoId, usuarioId) {
        return this.model.findOneAndUpdate(
            { _id: notificacaoId, usuario_id: usuarioId },
            { lida: true },
            { new: true }, //Retorna atualizado
        );
    }

    marcarTodasComoLidas(usuarioId) {
        return this.model.updateMany(
            { usuario_id: usuarioId, lida: false },
            { lida: true },
        );
    }
}

export default new NotificacaoRepository();
