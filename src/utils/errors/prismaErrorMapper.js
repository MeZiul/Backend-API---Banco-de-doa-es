import CustomError from '../helpers/CustomError.js';

//Define como cada erro conhecido do Prisma deve ser representado pela aplicação:

//statusCode = código HTTP da resposta
//errorType = identificador interno do erro.
//message = mensagem segura para apresentar ao usuário.

const PRISMA_ERROR_MAP = {
    P2000: {
        statusCode: 400,
        errorType: 'valueTooLong',
        message: 'O valor informado excede o tamanho permitido.',
    },

    P2002: {
        statusCode: 409,
        errorType: 'duplicateEntry',
        message: 'Já existe um registro com os dados informados.',
    },

    P2003: {
        statusCode: 409,
        errorType: 'referentialIntegrity',
        message: 'A operação viola uma referência existente.',
    },

    P2014: {
        statusCode: 409,
        errorType: 'relationConflict',
        message: 'A operação viola uma relação obrigatória.',
    },

    P2025: {
        statusCode: 404,
        errorType: 'resourceNotFound',
        message: 'Registro não encontrado.',
    },

    P2024: {
        statusCode: 503,
        errorType: 'databaseTimeout',
        message: 'O serviço está temporariamente indisponível.',
    },

    P2034: {
        statusCode: 409,
        errorType: 'transactionConflict',
        message: 'Conflito na operação. Tente novamente.',
    },
};

//Converte um erro conhecido do Prisma para CustomError.

//Retorna null quando o erro não possui um mapeamento,
//permitindo que o errorHandler trate o erro normalmente.

export function mapPrismaError(error) {
    const errorCode = error?.code;

    // Identifica apenas códigos no formato P seguido de 4 dígitos.
    if (typeof errorCode !== 'string' || !/^P\d{4}$/.test(errorCode)) {
        return null;
    }

    const mapping = PRISMA_ERROR_MAP[errorCode];

    // Erros desconhecidos não devem ser tratados como esperados.
    if (!mapping) {
        return null;
    }

    return new CustomError({
        statusCode: mapping.statusCode,
        errorType: mapping.errorType,
        customMessage: mapping.message,
        details: [{ message: mapping.message }],
    });
}
