import UsuarioRepository from "../repositories/UsuarioRepository.js";
import { CustomError } from "../utils/helpers/index.js";

const createEnsureActiveUserMiddleware = ({ usuarioRepository }) => {
    return async (req, _res, next) => {
        try {
            const usuarioId = req.user?.id;

            if (!usuarioId) {
                return next(new CustomError({
                    statusCode: 401,
                    customMessage: "Usuário autenticado não informado.",
                }));
            }

            const usuario = await usuarioRepository.buscarPorId(usuarioId);

            if (!usuario) {
                return next(new CustomError({
                    statusCode: 401,
                    customMessage: "Usuário autenticado não encontrado.",
                }));
            }

            if (usuario.situacao !== "ATIVO") {
                return next(new CustomError({
                    statusCode: 403,
                    customMessage: "Somente usuários ativos podem realizar operações protegidas.",
                }));
            }

            req.user = {
                ...req.user,
                nome: usuario.nome ?? req.user.nome,
                email: usuario.email ?? req.user.email,
                perfil: usuario.perfil,
                papeis: usuario.perfil ? [usuario.perfil] : [],
                situacao: usuario.situacao,
            };

            return next();
        } catch (error) {
            return next(error);
        }
    };
};

const usuarioRepository = new UsuarioRepository();
const EnsureActiveUserMiddleware = createEnsureActiveUserMiddleware({ usuarioRepository });

export { createEnsureActiveUserMiddleware };
export default EnsureActiveUserMiddleware;
