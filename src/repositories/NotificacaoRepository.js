import Notificacao from '../models/Notificacao.js';
import BaseRepository from '../repositories/base/BaseRepository.js';

class NotificacaoRepository extends BaseRepository {
    constructor() {
        super(Notificacao);
    }

    async listarDoUsuario(usuarioId, { page, limit }) {
        const skip = (page - 1) * limit;

        // ⚠️ ATENÇÃO: Verifique se no seu Banco/Model o campo é 'usuario_id' ou 'usuario'
        const query = { usuario_id: usuarioId };

        // O erro pode estar aqui se o this.model não estiver definido ou se os métodos do Mongoose falharem
        const notificacoes = await this.model.find(query)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .lean();

        const total = await this.model.countDocuments(query);

        return {
            notificacoes,
            paginacao: {
                total,
                pagina: page,
                limite: limit,
                total_paginas: Math.ceil(total / limit)
            }
        };
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
