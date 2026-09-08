import NotificacaoService from "../services/NotificacaoService.js";
import CommonResponse from "../utils/helpers/CommonResponse.js";

class NotificacaoController {

    listar = async (req, res) => {
        try {
            const { page, limit } = req.query;

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

    contarNaoLidas = async (req, res) => {
        try {
            const resultado = await NotificacaoService.contarNaoLidas(req.user.id);
            return CommonResponse.success(res, resultado);
        } catch (error) {
            return this._handleError(res, error, "Erro ao contar notificações não lidas.");
        }
    }

    marcarComoLida = async (req, res) => {
        try {
            const resultado = await NotificacaoService.marcarComoLida(req.params.id, req.user.id);
            return CommonResponse.success(res, resultado, 200, "Notificação marcada como lida.");
        } catch (error) {
            return this._handleError(res, error, "Erro ao atualizar notificação.");
        }
    }

    marcarTodasComoLidas = async (req, res) => {
        try {
            const resultado = await NotificacaoService.marcarTodasComoLidas(req.user.id);
            return CommonResponse.success(res, resultado, 200, resultado.mensagem);
        } catch (error) {
            return this._handleError(res, error, "Erro ao marcar todas as notificações.");
        }
    }

    _handleError(res, error, defaultMessage) {
        if (error.isOperational || error.statusCode) {
            return CommonResponse.error(
                res,
                error.statusCode || 400,
                error.errorType || 'notificationError',
                null,
                error.details || [],
                error.customMessage || error.message
            );
        }
        return CommonResponse.serverError(res, defaultMessage);
    }
}

export default new NotificacaoController();
