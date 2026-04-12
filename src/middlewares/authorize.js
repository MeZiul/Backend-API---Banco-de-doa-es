// src/middlewares/authorize.js
import { CustomError } from '../utils/helpers/index.js';

/** Papeis possíveis: ADMIN_PLATAFORMA, ADMIN_INSTITUICAO, OPERADOR, USUÁRIO_FINAL
 * ADMIN_PLATAFORMA: acesso total a todos os usuários e instituições
 * ADMIN_INSTITUICAO: acesso total aos usuários da própria instituição
 * OPERADOR: acesso limitado aos usuários da própria instituição, sem privilégios administrativos
 * USUÁRIO_FINAL: acesso apenas ao próprio perfil (não listado aqui, mas pode ser implementado em rotas específicas)
 */

/**
 * Middleware factory de autorização por papéis.
 *
 * Uso nas rotas:
 *   router.post('/filas', AuthMiddleware, authorize('ADMIN_INSTITUICAO', 'OPERADOR'), controller.criar)
 *
 * Depende de AuthMiddleware ter populado req.user = { id, papeis, instituicaoId }.
 */
const authorize = (...papeisPermitidos) => {
    return (req, _res, next) => {
        const { papeis } = req.user || {};

        if (!papeis || !Array.isArray(papeis)) {
            return next(new CustomError({
                statusCode: 403,
                customMessage: 'Acesso negado: papéis não identificados',
            }));
        }

        const possuiPapel = papeis.some((p) => papeisPermitidos.includes(p));

        if (!possuiPapel) {
            return next(new CustomError({
                statusCode: 403,
                customMessage: 'Acesso negado: permissão insuficiente',
            }));
        }

        next();
    };
};

export default authorize;
