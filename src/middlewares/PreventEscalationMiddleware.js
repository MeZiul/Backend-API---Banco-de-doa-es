import { PERFIS, PAPEIS_ADMIN_TODOS } from '../constants/roles.js';
import { CustomError } from '../utils/helpers/index.js';

const NIVEL_PAPEL = {
    [PERFIS.ADMINISTRADOR]: 2,
    [PERFIS.USUARIO]: 1,
};

const nivelPerfil = (papel) => NIVEL_PAPEL[papel] ?? -1;

const PreventEscalationMiddleware = (req, _res, next) => {
    const targetId = req.params.id;
    const requester = req.user || {};
    const novoPerfil = req.body?.perfil;

    // Impede alterar o PRÓPRIO perfil por essa rota
    if (String(targetId) === String(requester.id)) {
        return next(new CustomError({
            statusCode: 403,
            customMessage: 'Não é permitido alterar o próprio perfil de acesso por esta rota.',
        }));
    }

    // Impede atribuir um papel que o próprio requisitante não tem autoridade para conceder
    if (novoPerfil) {
        const nivelSolicitado = nivelPerfil(novoPerfil);
        const nivelRequisitante = Math.max(
            ...[requester.perfil, ...(requester.papeis || [])].map(nivelPerfil),
            -1
        );

        if (nivelSolicitado === -1) {
            return next(new CustomError({
                statusCode: 400,
                customMessage: 'Perfil de acesso inválido.',
            }));
        }

        if (nivelSolicitado >= nivelRequisitante) {
            return next(new CustomError({
                statusCode: 403,
                customMessage: 'Você não pode atribuir um nível de acesso igual ou superior ao seu.',
            }));
        }
    }

    next();
};

export default PreventEscalationMiddleware;