import PerfilService from "../services/PerfilService.js";
import CommonResponse from "../utils/helpers/CommonResponse.js";
import { gerenciarPerfilSchema } from "../utils/validators/schemas/zod/GerenciarPerfilSchema.js";

class PerfilController {

    gerenciarAcesso = async (req, res) => {
        try {
            const { id } = req.params;

            // 1. Valida os dados com o Zod
            const dadosValidados = gerenciarPerfilSchema.parse(req.body);

            // 2. Atualiza o banco através do Service
            const usuarioAtualizado = await PerfilService.alterarAcessoUsuario(id, dadosValidados);

            // CORREÇÃO FINAL: Passamos apenas o 'res' e o 'usuarioAtualizado'
            // O seu helper já se encarrega de injetar o status 200 e envelopar a resposta
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