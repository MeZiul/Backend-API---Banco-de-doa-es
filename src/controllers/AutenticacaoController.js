import { usuarioService } from "../containers/services.index.js";
import {
  UsuarioLoginSchema,
  UsuarioEsqueciSenhaSchema,
  UsuarioRedefinirSenhaSchema,
} from "../utils/validators/schemas/zod/UsuarioSchema.js";
import CommonResponse from "../utils/helpers/CommonResponse.js";

class AuthController {

  login = async (req, res, next) => {
    try {
      const { email, senha } = UsuarioLoginSchema.parse(req.body);
      const data = await usuarioService.login(email, senha);
      return CommonResponse.success(res, data);
    } catch (e) { next(e); }
  };

  esqueciSenha = async (req, res, next) => {
    try {
      const { email } = UsuarioEsqueciSenhaSchema.parse(req.body);
      const data = await usuarioService.esqueciSenha(email);
      return CommonResponse.success(res, data);
    } catch (e) { next(e); }
  };

  redefinirSenha = async (req, res, next) => {
    try {
      const { token, novaSenha } = UsuarioRedefinirSenhaSchema.parse(req.body);
      const data = await usuarioService.redefinirSenha(token, novaSenha);
      return CommonResponse.success(res, data);
    } catch (e) { next(e); }
  };
}

export default AuthController;