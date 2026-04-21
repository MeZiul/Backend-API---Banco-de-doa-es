import { categoriaService } from "../containers/services.index.js";
import {
  CategoriaSchema,
  CategoriaUpdateSchema,
  CategoriaIdSchema,
  CategoriaQuerySchema,
} from "../utils/validators/schemas/zod/CategoriaSchema.js";
import CommonResponse from "../utils/helpers/CommonResponse.js";

class CategoriaController {

  listar = async (req, res, next) => {
    try {
      const { limite, page, ...filtros } = CategoriaQuerySchema.parse(req.query ?? {});
      const data = await categoriaService.listar({ filtros, page, limit: limite }, req.user);
      return CommonResponse.success(res, data);
    } catch (e) { next(e); }
  };

  buscarPorId = async (req, res, next) => {
    try {
      CategoriaIdSchema.parse(req.params.id);
      const data = await categoriaService.buscarPorId(req.params.id);
      return CommonResponse.success(res, data);
    } catch (e) { next(e); }
  };

  criar = async (req, res, next) => {
    try {
      const dados = CategoriaSchema.parse(req.body);
      const data  = await categoriaService.criar(dados, req.user);
      return CommonResponse.created(res, data);
    } catch (e) { next(e); }
  };

  atualizar = async (req, res, next) => {
    try {
      CategoriaIdSchema.parse(req.params.id);
      const dados = CategoriaUpdateSchema.parse(req.body);
      const data  = await categoriaService.atualizar(req.params.id, dados, req.user);
      return CommonResponse.success(res, data);
    } catch (e) { next(e); }
  };

  deletar = async (req, res, next) => {
    try {
      CategoriaIdSchema.parse(req.params.id);
      await categoriaService.deletar(req.params.id, req.user);
      return CommonResponse.success(res, null, 204);
    } catch (e) { next(e); }
  };
}

export default CategoriaController; 