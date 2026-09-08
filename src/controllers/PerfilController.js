import PerfilService from "../services/PerfilService.js";
import CommonResponse from "../utils/helpers/CommonResponse.js";
import { atualizarPerfilSchema, gerenciarPerfilSchema } from "../utils/validators/schemas/zod/GerenciarPerfilSchema.js";

class PerfilController {

    buscar = async (req, res, next) => {
        try {
            const usuario = await PerfilService.buscarPerfil(req.user.id);
            return CommonResponse.success(res, usuario);
        } catch (error) {
            next(error);
        }
    }

    atualizar = async (req, res, next) => {
        try {
            const dados = atualizarPerfilSchema.parse(req.body);
            const usuario = await PerfilService.atualizarPerfil(req.user.id, dados);
            return CommonResponse.success(res, usuario);
        } catch (error) {
            next(error);
        }
    }

    desativar = async (req, res, next) => {
        try {
            await PerfilService.desativarPerfil(req.user.id);
            return res.status(204).send();
        } catch (error) {
            next(error);
        }
    }

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
