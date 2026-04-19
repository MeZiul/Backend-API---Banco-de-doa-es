// src/middlewares/ensureInstituicao.js
import { CustomError } from '../utils/helpers/index.js';
import { ROLES, PAPEIS_ADMIN_INSTITUICAO } from '../constants/roles.js';

/**
 * Middleware de isolamento institucional.
 *
 * Garante que usuários administrativos (ADMIN_INSTITUICAO, OPERADOR)
 * só acessem recursos da sua própria instituição.
 *
 * O id da instituição pode vir de:
 *   1. req.params.instituicaoId  (ex: /instituicoes/:instituicaoId/usuarios)
 *   2. req.body.instituicaoId    (ex: POST /filas com { instituicaoId })
 *   3. req.query.instituicaoId   (ex: GET /filas?instituicaoId=xxx)
 *
 * Para ADMIN_PLATAFORMA, o middleware não restringe (acesso global).
 * Para USUARIO_FINAL, não se aplica (sem instituicaoId no token).
 */
const ensureInstituicao = (req, _res, next) => {
    const { papeis, instituicaoId: userInstituicaoId } = req.user || {};

    // ADMIN_PLATAFORMA tem acesso global — não restringir
    if (papeis?.includes(ROLES.ADMIN_PLATAFORMA)) {
        return next();
    }

    // Usuários administrativos DEVEM ter instituicaoId no token
    const isAdmin = papeis?.some((p) => PAPEIS_ADMIN_INSTITUICAO.includes(p));

    if (!isAdmin) {
        // USUARIO_FINAL — não se aplica isolamento neste middleware
        return next();
    }

    if (!userInstituicaoId) {
        return next(new CustomError({
            statusCode: 403,
            customMessage: 'Acesso negado: usuário sem vínculo institucional',
        }));
    }

    // Determina qual instituição está sendo acessada
    // NOTA: Não usar req.params.id genericamente pois pode ser id de outro recurso (fila, senha, etc.)
    const targetInstituicaoId =
        req.params.instituicaoId ||
        req.body?.instituicaoId ||
        req.query?.instituicaoId;

    // Se não há target, injeta a instituição do usuário automaticamente
    if (!targetInstituicaoId) {
        req.body = req.body || {};
        req.body.instituicaoId = userInstituicaoId;
        return next();
    }

    // Compara stringificando para evitar problemas de ObjectId
    if (targetInstituicaoId.toString() !== userInstituicaoId.toString()) {
        return next(new CustomError({
            statusCode: 403,
            customMessage: 'Acesso negado: recurso pertence a outra instituição',
        }));
    }

    next();
};

export default ensureInstituicao;
