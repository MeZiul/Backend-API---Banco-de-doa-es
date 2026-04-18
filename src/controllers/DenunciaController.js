import { denunciaService } from "../containers/services.denuncia.container.js";
import CommonResponse from "../utils/helpers/CommonResponse.js";

class DenunciaController {
    criar = async (req, res) => {
        const resultado = await denunciaService.criar(req.body, req.user);

        return CommonResponse.created(res, resultado);
    };

    listar = async (req, res) => {
        const resultado = await denunciaService.listar(
            {
                filtros: req.query,
                page: req.query.page,
                limit: req.query.limit,
            },
            req.user
        );

        return CommonResponse.success(res, resultado);
    };

    buscarPorId = async (req, res) => {
        const resultado = await denunciaService.buscarPorId(req.params.id, req.user);

        return CommonResponse.success(res, resultado);
    };

    atualizar = async (req, res) => {
        const resultado = await denunciaService.atualizar(req.params.id, req.body, req.user);

        return CommonResponse.success(res, resultado);
    };

    deletar = async (req, res) => {
        const resultado = await denunciaService.deletar(req.params.id, req.user);

        return CommonResponse.success(res, resultado);
    };
}

export default new DenunciaController();
