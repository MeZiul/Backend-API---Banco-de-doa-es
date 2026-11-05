import CustomError from "./CustomError.js";
import messages from "./messages.js";

// Cria um erro HTTP 409 (Conflict).
//Utilizado quando uma operação não pode ser concluída devido ao estado atual de um recurso.
export function createConflictError(customMessage) {
    return new CustomError({
        statusCode: 409,
        customMessage,
    });
}

/**
 * Verifica se um registro existe.
 *
 * @param {Object|null} entidade - Registro retornado pelo repositório.
 * @param {string} nomeRecurso - Nome do recurso para a mensagem de erro.
 * @returns {Object} Registro validado.
 */
export function ensureExists(entidade, nomeRecurso) {
    if (!entidade) {
        throw new CustomError({
            statusCode: 404,
            customMessage: messages.error.resourceNotFound(nomeRecurso),
        });
    }

    return entidade;
}

/**
 * Busca um registro no repositório e verifica sua existência.
 *
 * @param {Function} buscar - Função responsável pela consulta.
 * @param {string} nomeRecurso - Nome do recurso.
 * @returns {Promise<Object>} Registro encontrado.
 */
export async function findOrThrow(buscar, nomeRecurso) {
    const entidade = await buscar();

    return ensureExists(entidade, nomeRecurso);
}
