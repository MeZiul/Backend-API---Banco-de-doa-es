import { interesseService } from "../containers/services.interesse.container.js";
import CommonResponse from "../utils/helpers/CommonResponse.js";

class InteresseController {
    criar = async (req, res) => {
        const resultado = await interesseService.criar(req.body, req.user);

        return CommonResponse.created(res, resultado);
    };

    listar = async (req, res) => {
        const resultado = await interesseService.listar(
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
        const resultado = await interesseService.buscarPorId(req.params.id, req.user);

        return CommonResponse.success(res, resultado);
    };

    aceitar = async (req, res) => {
        const resultado = await interesseService.aceitar(req.params.id, req.body, req.user);

        return CommonResponse.success(res, resultado);
    };

    recusar = async (req, res) => {
        const resultado = await interesseService.recusar(req.params.id, req.body, req.user);

        return CommonResponse.success(res, resultado);
    };

    cancelar = async (req, res) => {
        const resultado = await interesseService.cancelar(req.params.id, req.user);

        return CommonResponse.success(res, resultado);
    };
}

export default new InteresseController();
