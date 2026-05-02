import NotificacaoService from "./Services/NotificacaoService.js";
import CommonResponse from "../utils/helpers/CommonResponse.js";

class NotificacaoController {
    //Lista a ntificações
    async listar(req, res) {
        try {
            const { page, limit } = req.query;

            //req.user.id vem do AuthMidd
            const resultado = await NotificacaoService.listar(
                req.user.id,
                parseInt(page) || 1,
                parseInt(limit) || 20
            );

            return CommonResponse.success(res, resultado);

        } catch (error) {
            return this._handleError(res, error, "Erro ao listar notificações.");
        }
    }

    //Retorna total de não lidas
    async contarNaoLidas(req, res) {
        try {
            const resultado = await NotificacaoService.contarNaoLidas(req.user.id);
            return CommonResponse.success(res, resultado);
        } catch (error) {
            return this._handleError(res, error, "Erro ao contar notificações não lidas.")
        }
    }

    //Marca um notificação específica como lida.
    async marcarComoLidas(req, res) {
        try {
            const { id } = req.params;
            const notificacao = await NotificacaoService.marcarComoLidas(id, req.user.id);

            return CommonResponse.success(res, notificacao, 200, "Notificacao marcada como lida.")

        } catch(error) {
            return this._handleError(res, error, "Erro ao atualizar notificação.")
        }
    }

    //Mar todas as notificações como lidas
    async marcarTodasComoLidas(req, res) {
        try {
            const resultado = await NotificacaoService.marcarTodasComoLidas(req.user.id);
            return CommonResponse.success(res, resultado.data, 200, resultado.mensagem);

        } catch (error) {
            return this._handleError(res, error, "Erro ao marcar todas as notificações.")
        }
    }

    //Método auxiliar para padronizar tratamento de erros
    _handleError(res, error, defaultMessage) {
        if (error.isOperational || error.statusCode) {
            return CommonResponse.error(
                res,
                error.statusCode || 400,
                error.errorType || 'notificationError',
                error.field || null,
                error.details || [],
                error.customMessage || error.message
            );
        }
        return CommonResponse.serverError(res, defaultMessage);
    }

}

export default new NotificacaoController();
