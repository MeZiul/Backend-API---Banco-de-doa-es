import { getEntityId } from "./entityHelper.js";
import logger from "../logger.js";

/**
 * Monta o objeto de uma notificação.
 * Padroniza os campos utilizados pelos serviços incluindo a normalização dos identificadores.
 *
 * @param {Object} dados - Informações da notificação.
 * @returns {Object} Notificação formatada.
 */
export function criarNotificacao({
    usuarioId,
    tipo,
    titulo,
    mensagem,
    referenciaTipo,
    referenciaId
}) {
    return {
        usuario_id: getEntityId(usuarioId),
        tipo,
        titulo,
        mensagem,
        referencia_tipo: referenciaTipo,
        referencia_id: getEntityId(referenciaId)
    };
}

/**
 * Envia notificações de forma segura.
 * Falhas no serviço de notificações não interrompem a operação principal que originou o envio,
 * mas ficam registradas no log.
 *
 * @param {Object} notificacaoService - Serviço de notificações.
 * @param {Array} notificacoes - Lista de notificações.
 * @returns {Promise<Array>} Resultado do envio ou lista vazia.
 */
export async function notificar(notificacaoService, notificacoes) {
    if (notificacoes.length === 0) { return []; }

    try {
        return await notificacaoService.criarNotificacoesComSeguranca(notificacoes);
    } catch (erro) {
        logger.warn("Falha ao enviar notificações.", { erro: erro.message, quantidade: notificacoes.length });
        return [];
    }
}
