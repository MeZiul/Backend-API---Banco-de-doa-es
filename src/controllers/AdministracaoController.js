import { administracaoService } from "../containers/services.index.js";
import {
    AdministracaoAcaoSchema,
    AdministracaoBloquearUsuarioSchema,
    AdministracaoIdSchema,
    AdministracaoQuerySchema,
    AdministracaoResolverDenunciaSchema,
} from "../utils/validators/schemas/zod/AdministracaoSchema.js";
import { DenunciaQuerySchema } from "../utils/validators/schemas/zod/DenunciaSchema.js";
import { administracaoItemDoacaoQuerySchema } from "../utils/validators/schemas/zod/querys/ItemDoacaoQuerySchema.js";
import { AdministracaoUsuarioQuerySchema } from "../utils/validators/schemas/zod/UsuarioSchema.js";
import CommonResponse from "../utils/helpers/CommonResponse.js";

class AdministracaoController {
    listar = async (req, res, next) => {
        try {
            const { page, limit, limite, ...filtros } = AdministracaoQuerySchema.parse(req.query ?? {});
            const resultado = await administracaoService.listar(
                {
                    filtros,
                    page,
                    limit: limit ?? limite,
                },
                req.user
            );

            return CommonResponse.success(res, resultado);
        } catch (e) {
            next(e);
        }
    };

    buscarPorId = async (req, res, next) => {
        try {
            AdministracaoIdSchema.parse(req.params.id);
            const resultado = await administracaoService.buscarPorId(req.params.id, req.user);

            return CommonResponse.success(res, resultado);
        } catch (e) {
            next(e);
        }
    };

    listarPorAlvo = async (req, res, next) => {
        try {
            AdministracaoIdSchema.parse(req.params.alvoId);
            const { page, limit, limite } = AdministracaoQuerySchema.parse(req.query ?? {});
            const resultado = await administracaoService.listarPorAlvo(
                req.params.alvoId,
                {
                    page,
                    limit: limit ?? limite,
                },
                req.user
            );

            return CommonResponse.success(res, resultado);
        } catch (e) {
            next(e);
        }
    };

    listarPorAdministrador = async (req, res, next) => {
        try {
            AdministracaoIdSchema.parse(req.params.administradorId);
            const { page, limit, limite } = AdministracaoQuerySchema.parse(req.query ?? {});
            const resultado = await administracaoService.listarPorAdministrador(
                req.params.administradorId,
                {
                    page,
                    limit: limit ?? limite,
                },
                req.user
            );

            return CommonResponse.success(res, resultado);
        } catch (e) {
            next(e);
        }
    };

    listarUsuarios = async (req, res, next) => {
        try {
            const { page, limit, limite, ...filtros } = AdministracaoUsuarioQuerySchema.parse(req.query ?? {});
            const resultado = await administracaoService.listarUsuarios(
                {
                    filtros,
                    page,
                    limit: limit ?? limite,
                },
                req.user
            );

            return CommonResponse.success(res, resultado);
        } catch (e) {
            next(e);
        }
    };

    buscarUsuarioPorId = async (req, res, next) => {
        try {
            AdministracaoIdSchema.parse(req.params.id);
            const resultado = await administracaoService.buscarUsuarioPorId(req.params.id, req.user);

            return CommonResponse.success(res, resultado);
        } catch (e) {
            next(e);
        }
    };

    listarItens = async (req, res, next) => {
        try {
            const { page, limit, ordenacao, ...filtros } = administracaoItemDoacaoQuerySchema.parse(req.query ?? {});
            const resultado = await administracaoService.listarItens(
                {
                    filtros,
                    page,
                    limit,
                    ordenacao,
                },
                req.user
            );

            return CommonResponse.success(res, resultado);
        } catch (e) {
            next(e);
        }
    };

    listarDenuncias = async (req, res, next) => {
        try {
            const { page, limit, limite, ...filtros } = DenunciaQuerySchema.parse(req.query ?? {});
            const resultado = await administracaoService.listarDenuncias(
                {
                    filtros,
                    page,
                    limit: limit ?? limite,
                },
                req.user
            );

            return CommonResponse.success(res, resultado);
        } catch (e) {
            next(e);
        }
    };

    bloquearUsuario = async (req, res, next) => {
        try {
            AdministracaoIdSchema.parse(req.params.id);
            const dados = AdministracaoBloquearUsuarioSchema.parse(req.body ?? {});
            const resultado = await administracaoService.bloquearUsuario(
                req.params.id,
                dados,
                req.user
            );

            return CommonResponse.success(res, resultado);
        } catch (e) {
            next(e);
        }
    };

    desbloquearUsuario = async (req, res, next) => {
        try {
            AdministracaoIdSchema.parse(req.params.id);
            const dados = AdministracaoAcaoSchema.parse(req.body ?? {});
            const resultado = await administracaoService.desbloquearUsuario(
                req.params.id,
                dados,
                req.user
            );

            return CommonResponse.success(res, resultado);
        } catch (e) {
            next(e);
        }
    };

    inativarUsuario = async (req, res, next) => {
        try {
            AdministracaoIdSchema.parse(req.params.id);
            const dados = AdministracaoAcaoSchema.parse(req.body ?? {});
            const resultado = await administracaoService.inativarUsuario(
                req.params.id,
                dados,
                req.user
            );

            return CommonResponse.success(res, resultado);
        } catch (e) {
            next(e);
        }
    };

    cancelarItem = async (req, res, next) => {
        try {
            AdministracaoIdSchema.parse(req.params.id);
            const dados = AdministracaoAcaoSchema.parse(req.body ?? {});
            const resultado = await administracaoService.cancelarItem(
                req.params.id,
                dados,
                req.user
            );

            return CommonResponse.success(res, resultado);
        } catch (e) {
            next(e);
        }
    };

    resolverDenuncia = async (req, res, next) => {
        try {
            AdministracaoIdSchema.parse(req.params.id);
            const dados = AdministracaoResolverDenunciaSchema.parse(req.body ?? {});
            const resultado = await administracaoService.resolverDenuncia(
                req.params.id,
                dados,
                req.user
            );

            return CommonResponse.success(res, resultado);
        } catch (e) {
            next(e);
        }
    };
}

export default new AdministracaoController();
