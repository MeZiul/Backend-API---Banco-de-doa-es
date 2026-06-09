import PerfilService from "../services/PerfilService.js";
import CommonResponse from "../utils/helpers/CommonResponse.js";
import { gerenciarPerfilSchema } from "../utils/validators/schemas/zod/GerenciarPerfilSchema.js";

class PerfilController {

    gerenciarAcesso = async (req, res) => {
        try {
            const { id } = req.params;

            const dadosValidados = gerenciarPerfilSchema.parse(req.body);

            const usuarioAtualizado = await PerfilService.alterarAcessoUsuario(id, dadosValidados);


            return CommonResponse.success(res, usuarioAtualizado);

        } catch (error) {
            console.error("❌ ERRO REAL NO PERFIL:", error);
            return this._handleError(res, error, "Erro ao atualizar controle de acesso.");
        }
    }

    _handleError(res, error, defaultMessage) {
        if (error.name === "ZodError") {
            return CommonResponse.error(
                res,
                400,
                'validationError',
                null,
                error.errors.map(e => ({ campo: e.path[0], mensagem: e.message })),
                "Erro de validação nos dados enviados."
            );
        }
        if (error.isOperational || error.statusCode) {
            return CommonResponse.error(
                res,
                error.statusCode || 400,
                error.errorType || 'perfilAcessoError',
                null,
                error.details || [],
                error.customMessage || error.message
            );
        }
        return CommonResponse.serverError(res, defaultMessage);
    }
}

export default new PerfilController();