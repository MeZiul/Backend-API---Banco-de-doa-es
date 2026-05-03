import { usuarioService } from "../containers/services.index.js";
import {
  UsuarioLoginSchema,
  UsuarioEsqueciSenhaSchema,
  UsuarioRedefinirSenhaSchema,
} from "../utils/validators/schemas/zod/UsuarioSchema.js";
import CommonResponse from "../utils/helpers/CommonResponse.js";
import { tokenBlacklist } from "../utils/tokenBlacklist.js";


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
  
  logout = async (req, res, next) => {
    try {
      const authHeader = req.headers?.authorization;
      const parts = authHeader?.split(" ");
      const token = parts?.length === 2 ? parts[1] : parts?.[0];

      if (token) {
        tokenBlacklist.add(token); 
      }

      return CommonResponse.success(res, { message: "Logout realizado com sucesso." });
    } catch (e) { next(e); }
  };

  refreshToken = async (req, res, next) => {
  try {
      const { id, nome, email, perfil } = req.user;

      const novoToken = await usuarioService.refreshToken({ id, nome, email, perfil });
      return CommonResponse.success(res, { token: novoToken });
    }   catch (e) { next(e); }
  };
  
}

export default AuthController;