import { autenticacaoService } from "../containers/services.index.js";
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
      const data = await autenticacaoService.login(email, senha, req.headers);
      return CommonResponse.success(res, data);
    } catch (e) { next(e); }
  };

  esqueciSenha = async (req, res, next) => {
    try {
      const { email } = UsuarioEsqueciSenhaSchema.parse(req.body);
      const data = await autenticacaoService.esqueciSenha(email);
      return CommonResponse.success(res, data);
    } catch (e) { next(e); }
  };

  redefinirSenha = async (req, res, next) => {
    try {
      const { token, novaSenha } = UsuarioRedefinirSenhaSchema.parse(req.body);
      const data = await autenticacaoService.redefinirSenha(token, novaSenha);
      return CommonResponse.success(res, data);
    } catch (e) { next(e); }
  };
  
  logout = async (req, res, next) => {
    try {
      const data = await autenticacaoService.logout(req.headers);
      return CommonResponse.success(res, data);
    } catch (e) { next(e); }
  };

  refreshToken = async (req, res, next) => {
  try {
      const novoToken = await autenticacaoService.refreshToken({
        sessionToken: req.auth?.session?.token,
        usuarioId: req.user?.id,
      });
      return CommonResponse.success(res, { token: novoToken });
    }   catch (e) { next(e); }
  };
  
}

export default AuthController;
