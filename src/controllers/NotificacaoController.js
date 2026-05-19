import NotificacaoService from "../services/NotificacaoService.js";
import CommonResponse from "../utils/helpers/CommonResponse.js";

class NotificacaoController {

    // Mude de "async listar(req, res)" para:
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
            // Agora o 'this' vai funcionar e achar o _handleError!
            return this._handleError(res, error, "Erro ao listar notificações.");
        }
    }

    // Repita o padrão ( => ) nos outros métodos:
    contarNaoLidas = async (req, res) => {
        try {
            const resultado = await NotificacaoService.contarNaoLidas(req.user.id);
            return CommonResponse.success(res, resultado);
        } catch (error) {
            return this._handleError(res, error, "Erro ao contar notificações não lidas.");
        }
    }

    // ... faça o mesmo para marcarComoLida e marcarTodasComoLidas ...

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
