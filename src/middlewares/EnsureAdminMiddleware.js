import { PAPEIS_ADMIN_TODOS, PERFIS } from '../constants/roles.js';
import { CustomError } from '../utils/helpers/index.js';

const EnsureAdminMiddleware = (req, _res, next) => {
    const { perfil, papeis } = req.user || {};
    const papeisDoUsuario = Array.isArray(papeis) && papeis.length > 0
        ? papeis
        : (perfil ? [perfil] : []);

    const isAdmin = perfil === PERFIS.ADMINISTRADOR
        || papeisDoUsuario.some((papel) => PAPEIS_ADMIN_TODOS.includes(papel));

    if (!isAdmin) {
        return next(new CustomError({
            statusCode: 403,
            customMessage: 'Apenas administradores podem realizar esta operação.',
        }));
    }

    next();
};

export default EnsureAdminMiddleware;
