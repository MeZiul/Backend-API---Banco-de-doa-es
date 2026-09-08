import { interesseService } from "../containers/services.index.js";
import {
  InteresseIdSchema,
  InteresseQuerySchema,
  InteresseRespostaSchema,
  InteresseSchema,
} from "../utils/validators/schemas/zod/InteresseSchema.js";
import CommonResponse from "../utils/helpers/CommonResponse.js";

class InteresseController {
  criar = async (req, res, next) => {
    try {
      const dados = InteresseSchema.parse(req.body);
      const resultado = await interesseService.criar(dados, req.user);

      return CommonResponse.created(res, resultado);
    } catch (e) {
      next(e);
    }
  };

  listar = async (req, res, next) => {
    try {
      const { page, limit, limite, ...filtros } = InteresseQuerySchema.parse(
        req.query ?? {},
      );
      const resultado = await interesseService.listar(
        {
          filtros,
          page,
          limit: limit ?? limite,
        },
        req.user,
      );

      return CommonResponse.success(res, resultado);
    } catch (e) {
      next(e);
    }
  };
  listarRecebidos = async (req, res, next) => {
    try {
      const { page, limit, limite, ...filtros } = InteresseQuerySchema.parse(
        req.query ?? {},
      );
      const resultado = await interesseService.listarRecebidos(
        { filtros, page, limit: limit ?? limite },
        req.user,
      );
      return CommonResponse.success(res, resultado);
    } catch (e) {
      next(e);
    }
  };
  buscarPorId = async (req, res, next) => {
    try {
      InteresseIdSchema.parse(req.params.id);
      const resultado = await interesseService.buscarPorId(
        req.params.id,
        req.user,
      );

      return CommonResponse.success(res, resultado);
    } catch (e) {
      next(e);
    }
  };

  aceitar = async (req, res, next) => {
    try {
      InteresseIdSchema.parse(req.params.id);
      const dados = InteresseRespostaSchema.parse(req.body ?? {});
      const resultado = await interesseService.aceitar(
        req.params.id,
        dados,
        req.user,
      );

      return CommonResponse.success(res, resultado);
    } catch (e) {
      next(e);
    }
  };

  recusar = async (req, res, next) => {
    try {
      InteresseIdSchema.parse(req.params.id);
      const dados = InteresseRespostaSchema.parse(req.body ?? {});
      const resultado = await interesseService.recusar(
        req.params.id,
        dados,
        req.user,
      );

      return CommonResponse.success(res, resultado);
    } catch (e) {
      next(e);
    }
  };

  cancelar = async (req, res, next) => {
    try {
      InteresseIdSchema.parse(req.params.id);
      const resultado = await interesseService.cancelar(
        req.params.id,
        req.user,
      );

      return CommonResponse.success(res, resultado);
    } catch (e) {
      next(e);
    }
  };
}

export default new InteresseController();
