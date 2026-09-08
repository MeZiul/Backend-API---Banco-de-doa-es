import { avaliacaoService } from "../containers/services.index.js";
import {
  AvaliacaoSchema,
  AvaliacaoUpdateSchema,
  AvaliacaoIdSchema,
  AvaliacaoQuerySchema,
} from "../utils/validators/schemas/zod/AvaliacaoSchema.js";
import CommonResponse from "../utils/helpers/CommonResponse.js";

class AvaliacaoController {

  criar = async (req, res, next) => {
    try {
      const dados = AvaliacaoSchema.parse(req.body);
      const data  = await avaliacaoService.criar(dados, req.user.id);
      return CommonResponse.created(res, data);
    } catch (e) { next(e); }
  };

  listar = async (req, res, next) => {
    try {
      const { limite, page, ...filtros } = AvaliacaoQuerySchema.parse(req.query ?? {});
      const data = await avaliacaoService.listarPorUsuario({ filtros, page, limit: limite }, req.user);
      return CommonResponse.success(res, data);
    } catch (e) { next(e); }
  };

  buscarPorId = async (req, res, next) => {
    try {
      AvaliacaoIdSchema.parse(req.params.id);
      const data = await avaliacaoService.buscarPorId(req.params.id, req.user);
      return CommonResponse.success(res, data);
    } catch (e) { next(e); }
  };

  atualizar = async (req, res, next) => {
    try {
      AvaliacaoIdSchema.parse(req.params.id);
      const dados = AvaliacaoUpdateSchema.parse(req.body);
      const data  = await avaliacaoService.atualizar(req.params.id, dados, req.user);
      return CommonResponse.success(res, data);
    } catch (e) { next(e); }
  };

  deletar = async (req, res, next) => {
    try {
      AvaliacaoIdSchema.parse(req.params.id);
      await avaliacaoService.deletar(req.params.id, req.user);
      return CommonResponse.success(res, null, 204);
    } catch (e) { next(e); }
  };
}

export default AvaliacaoController; 
