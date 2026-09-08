import { fromNodeHeaders } from "better-auth/node";
import AuthenticationError from "../utils/errors/AuthenticationError.js";
import { CustomError } from "../utils/helpers/index.js";

const mapAuthenticatedUser = (usuario) => ({
  id: usuario._id,
  nome: usuario.nome,
  email: usuario.email,
  perfil: usuario.perfil,
  papeis: usuario.perfil ? [usuario.perfil] : [],
  instituicaoId: null,
  situacao: usuario.situacao,
});

const createAuthMiddleware = ({
  authClient,
  usuarioRepository,
  requireActive = true,
}) => async (req, _res, next) => {
  try {
    const session = await authClient.api.getSession({
      headers: fromNodeHeaders(req.headers || {}),
      query: { disableCookieCache: true },
    });

    if (!session?.user?.id) {
      throw new AuthenticationError(
        "Token inválido ou expirado. Faça login novamente.",
      );
    }

    const usuario = await usuarioRepository.buscarPorId(session.user.id);
    if (!usuario) {
      throw new AuthenticationError("Usuário autenticado não encontrado.");
    }

    if (requireActive && usuario.situacao !== "ATIVO") {
      throw new CustomError({
        statusCode: 403,
        customMessage:
          "Somente usuários ativos podem realizar operações protegidas.",
      });
    }

    req.auth = session;
    req.user = mapAuthenticatedUser(usuario);
    return next();
  } catch (error) {
    return next(error);
  }
};

export { createAuthMiddleware, mapAuthenticatedUser };
