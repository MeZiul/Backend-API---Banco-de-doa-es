import { administracaoService } from "../containers/services.administracao.container.js";
import CommonResponse from "../utils/helpers/CommonResponse.js";

class AdministracaoController {
    listar = async (req, res) => {
        const resultado = await administracaoService.listar(
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
        const resultado = await administracaoService.buscarPorId(req.params.id, req.user);

        return CommonResponse.success(res, resultado);
    };

    listarPorAlvo = async (req, res) => {
        const resultado = await administracaoService.listarPorAlvo(
            req.params.alvoId,
            {
                page: req.query.page,
                limit: req.query.limit,
            },
            req.user
        );

        return CommonResponse.success(res, resultado);
    };

    listarPorAdministrador = async (req, res) => {
        const resultado = await administracaoService.listarPorAdministrador(
            req.params.administradorId,
            {
                page: req.query.page,
                limit: req.query.limit,
            },
            req.user
        );

        return CommonResponse.success(res, resultado);
    };

    bloquearUsuario = async (req, res) => {
        const resultado = await administracaoService.bloquearUsuario(
            req.params.id,
            req.body,
            req.user
        );

        return CommonResponse.success(res, resultado);
    };

    desbloquearUsuario = async (req, res) => {
        const resultado = await administracaoService.desbloquearUsuario(
            req.params.id,
            req.body,
            req.user
        );

        return CommonResponse.success(res, resultado);
    };

    inativarUsuario = async (req, res) => {
        const resultado = await administracaoService.inativarUsuario(
            req.params.id,
            req.body,
            req.user
        );

        return CommonResponse.success(res, resultado);
    };

    cancelarItem = async (req, res) => {
        const resultado = await administracaoService.cancelarItem(
            req.params.id,
            req.body,
            req.user
        );

        return CommonResponse.success(res, resultado);
    };

    resolverDenuncia = async (req, res) => {
        const resultado = await administracaoService.resolverDenuncia(
            req.params.id,
            req.body,
            req.user
        );

        return CommonResponse.success(res, resultado);
    };
}

export default new AdministracaoController();
