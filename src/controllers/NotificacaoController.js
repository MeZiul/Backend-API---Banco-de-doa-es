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
