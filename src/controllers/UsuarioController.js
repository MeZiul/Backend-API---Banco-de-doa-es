import { usuarioService } from "../containers/services.index.js";
import {
  UsuarioSchema,
  UsuarioUpdateSchema,
  UsuarioExcluirSchema,
  UsuarioIdSchema,
  UsuarioQuerySchema,
} from "../utils/validators/schemas/zod/UsuarioSchema.js";
import CommonResponse from "../utils/helpers/CommonResponse.js";

class UsuarioController {
  cadastrar = async (req, res, next) => {
    try {
      const dados = UsuarioSchema.parse(req.body);
      const data = await usuarioService.cadastrar(dados);
      const usuarioLimpo = data.toObject();
      delete usuarioLimpo.senha;
      return CommonResponse.created(res, usuarioLimpo);
    } catch (e) {
      next(e);
    }
  };

  listar = async (req, res, next) => {
    try {
      const { limite, page, ...filtros } = UsuarioQuerySchema.parse(
        req.query ?? {},
      );
      const data = await usuarioService.listar({
        filtros,
        page,
        limit: limite,
        actor: req.user,
      });
      return CommonResponse.success(res, data);
    } catch (e) {
      next(e);
    }
  };

  buscarPorId = async (req, res, next) => {
    try {
      UsuarioIdSchema.parse(req.params.id);
      const data = await usuarioService.buscarPorId(req.params.id, req.user);
      return CommonResponse.success(res, data);
    } catch (e) {
      next(e);
    }
  };

  atualizar = async (req, res, next) => {
    try {
      UsuarioIdSchema.parse(req.params.id);
      const dados = UsuarioUpdateSchema.parse(req.body);
      const data = await usuarioService.atualizar(
        req.params.id,
        dados,
        req.user,
      );
      const usuarioLimpo = data.toObject();
      delete usuarioLimpo.senha;
      return CommonResponse.success(res, usuarioLimpo);
    } catch (e) {
      next(e);
    }
  };

  atualizarParcial = async (req, res, next) => {
    try {
      UsuarioIdSchema.parse(req.params.id);
      const dados = UsuarioUpdateSchema.partial().parse(req.body);
      const data = await usuarioService.atualizar(
        req.params.id,
        dados,
        req.user,
      );
      const usuarioLimpo = data.toObject();
      delete usuarioLimpo.senha;
      return CommonResponse.success(res, usuarioLimpo);
    } catch (e) {
      next(e);
    }
  };

  excluir = async (req, res, next) => {
    try {
      UsuarioIdSchema.parse(req.params.id);
      const { senha } = UsuarioExcluirSchema.parse(req.body);
      await usuarioService.excluir(req.params.id, senha, req.user);
      return CommonResponse.success(res, null, 204);
    } catch (e) {
      next(e);
    }
  };

  listarItens = async (req, res, next) => {
    try {
      UsuarioIdSchema.parse(req.params.id);
      const data = await usuarioService.listarItens(req.params.id);
      return CommonResponse.success(res, data);
    } catch (e) {
      next(e);
    }
  };

  listarAvaliacoes = async (req, res, next) => {
    try {
      UsuarioIdSchema.parse(req.params.id);
      const data = await usuarioService.listarAvaliacoes(req.params.id);
      return CommonResponse.success(res, data);
    } catch (e) {
      next(e);
    }
  };

  suspender = async (req, res, next) => {
    try {
      UsuarioIdSchema.parse(req.params.id);
      const { motivo, suspensao_ate } = req.body;
      const data = await usuarioService.suspender(
        req.params.id,
        { motivo, suspensao_ate },
        req.user,
      );
      return CommonResponse.success(res, data);
    } catch (e) {
      next(e);
    }
  };

  reativar = async (req, res, next) => {
    try {
      UsuarioIdSchema.parse(req.params.id);
      const data = await usuarioService.reativar(req.params.id, req.user);
      return CommonResponse.success(res, data);
    } catch (e) {
      next(e);
    }
  };
}

export default UsuarioController;
