import { denunciaService } from "../containers/services.index.js";
import {
    DenunciaIdSchema,
    DenunciaQuerySchema,
    DenunciaSchema,
    DenunciaUpdateSchema,
} from "../utils/validators/schemas/zod/DenunciaSchema.js";
import CommonResponse from "../utils/helpers/CommonResponse.js";

class DenunciaController {
    criar = async (req, res, next) => {
        try {
            const dados = DenunciaSchema.parse(req.body);
            const resultado = await denunciaService.criar(dados, req.user);

            return CommonResponse.created(res, resultado);
        } catch (e) {
            next(e);
        }
    };

    listar = async (req, res, next) => {
        try {
            const { page, limit, limite, ...filtros } = DenunciaQuerySchema.parse(req.query ?? {});
            const resultado = await denunciaService.listar(
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
            DenunciaIdSchema.parse(req.params.id);
            const resultado = await denunciaService.buscarPorId(req.params.id, req.user);

            return CommonResponse.success(res, resultado);
        } catch (e) {
            next(e);
        }
    };

    atualizar = async (req, res, next) => {
        try {
            DenunciaIdSchema.parse(req.params.id);
            const dados = DenunciaUpdateSchema.parse(req.body);
            const resultado = await denunciaService.atualizar(req.params.id, dados, req.user);

            return CommonResponse.success(res, resultado);
        } catch (e) {
            next(e);
        }
    };

    deletar = async (req, res, next) => {
        try {
            DenunciaIdSchema.parse(req.params.id);
            const resultado = await denunciaService.deletar(req.params.id, req.user);

            return CommonResponse.success(res, resultado);
        } catch (e) {
            next(e);
        }
    };
}

export default new DenunciaController();
