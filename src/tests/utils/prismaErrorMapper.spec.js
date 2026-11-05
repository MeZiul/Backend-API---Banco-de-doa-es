import { describe, expect, test } from '@jest/globals';

import { mapPrismaError } from '../../utils/errors/prismaErrorMapper.js';
import { mapPrismaErrorToLegacy } from '../../repositories/prisma/prismaUtils.js';
import errorHandler from '../../utils/helpers/errorHandler.js';
import CustomError from '../../utils/helpers/CustomError.js';

// Resposta falsa do Express para testar o middleware sem precisar iniciar o servidor ou fazer requisições HTTP.
function createMockResponse() {
    return {
        statusCode: null,
        body: null,

        // Simula res.status(409), armazenando o código HTTP.
        status(code) {
            this.statusCode = code;
            return this;
        },

        // Simula res.json(data), armazenando o corpo da resposta.
        // A conversão para JSON cria uma cópia serializada dos dados.
        json(data) {
            this.body = JSON.parse(JSON.stringify(data));
            return this;
        },
    };
}

// Executa o middleware de tratamento de erros diretamente.
// Permite verificar a resposta que seria enviada ao cliente.
function executeErrorHandler(error) {
    // Simula uma requisição com informações básicas.
    const req = {
        path: '/teste',
        requestId: 'teste-prisma'
    };

    // Cria a resposta falsa que receberá o resultado.
    const res = createMockResponse();

    // Passa o erro para o middleware, como o Express faria.
    // O último argumento representa a função next().
    errorHandler(error, req, res, () => { });

    return res;
}

// ============================================================
// 1. TESTES DE CONVERSÃO DOS ERROS DO PRISMA
// ============================================================

describe('Prisma Error Mapper', () => {
    // Cada cenário contém: [código do Prisma, status HTTP esperado, tipo do erro esperado].
    const cases = [
        ['P2000', 400, 'valueTooLong'],
        ['P2002', 409, 'duplicateEntry'],
        ['P2003', 409, 'referentialIntegrity'],
        ['P2014', 409, 'relationConflict'],
        ['P2025', 404, 'resourceNotFound'],
        ['P2024', 503, 'databaseTimeout'],
        ['P2034', 409, 'transactionConflict'],
    ];

    // test.each executa o mesmo teste para cada cenário acima.
    // %s representa texto e %i representa um número inteiro.
    test.each(cases)(
        '%s deve gerar HTTP %i com tipo %s',
        (code, statusCode, errorType) => {
            // Simula um erro do Prisma com o código atual.
            const result = mapPrismaError({ code });

            // Verifica se o erro foi convertido para CustomError.
            expect(result).toBeInstanceOf(CustomError);

            // Confirma que o status HTTP corresponde ao esperado.
            expect(result.statusCode).toBe(statusCode);

            // Confirma que o tipo de erro está correto.
            expect(result.errorType).toBe(errorType);

            // Verifica se o erro é considerado operacional, ou seja, um erro esperado e tratável pela aplicação.
            expect(result.isOperational).toBe(true);
        }
    );

    test('não converte erros desconhecidos', () => {
        // Um código não mapeado deve retornar null.
        expect(mapPrismaError({ code: 'P9999' })).toBeNull();

        // Um erro comum do JavaScript também não deve ser convertido.
        expect(mapPrismaError(new Error('Falha qualquer'))).toBeNull();

        // A função deve aceitar null sem provocar uma exceção.
        expect(mapPrismaError(null)).toBeNull();
    });

    test('não expõe mensagens técnicas do Prisma', () => {
        // Simula um erro contendo informações internas do banco.
        const result = mapPrismaError({
            code: 'P2002',
            message: 'SQL interno com informações sensíveis',
            meta: { target: ['email'] },
        });

        // A mensagem apresentada ao usuário não deve conter detalhes técnicos ou informações potencialmente sensíveis.
        expect(result.customMessage).not.toContain('SQL interno');
        expect(result.customMessage).not.toContain('sensíveis');
    });
});

// ============================================================
// 2. TESTES DE COMPATIBILIDADE COM ERROS LEGADOS
// ============================================================

describe('Compatibilidade com erros legados', () => {
    test('converte P2002 para 11000', () => {
        // Simula um erro P2002 do Prisma que indica violação de uma restrição de unicidade.
        const original = {
            code: 'P2002',
            meta: { target: ['cpf'] },
            message: 'Erro técnico interno',
        };

        // Converte o erro para o formato legado utilizado por partes existentes da aplicação.
        const result = mapPrismaErrorToLegacy(original);

        // Confirma a conversão do código P2002 para 11000.
        expect(result.code).toBe(11000);

        // Verifica se o campo duplicado foi identificado.
        expect(result.keyValue).toEqual({ cpf: 'duplicado' });

        // Confirma que o erro original foi preservado como causa.
        expect(result.cause).toBe(original);

        // Garante que a mensagem técnica original não seja utilizada como mensagem do erro convertido.
        expect(result.message).not.toContain('Erro técnico interno');
    });

    test('preserva erros que não são P2002', () => {
        const original = { code: 'P2025' };

        // toBe verifica se o objeto retornado é exatamente a mesma referência do objeto original.
        // Ou seja, não deve criar outro objeto nem modificá-lo.
        expect(mapPrismaErrorToLegacy(original)).toBe(original);
    });
});

// ============================================================
// 3. TESTES DO MIDDLEWARE DE TRATAMENTO DE ERROS
// ============================================================

describe('Middleware errorHandler', () => {
    test('retorna HTTP 409 para P2002', () => {
        // Envia um erro de duplicidade ao middleware.
        const res = executeErrorHandler({
            code: 'P2002',
            message: 'Erro técnico do banco',
        });

        // HTTP 409 indica conflito com o estado do recurso.
        expect(res.statusCode).toBe(409);

        // A resposta deve apresentar uma mensagem compreensível.
        expect(res.body.message).toBe('Já existe um registro com os dados informados.');

        // Não deve retornar dados adicionais neste cenário.
        expect(res.body.data).toBeNull();

        // Não deve expor a mensagem técnica original.
        expect(res.body.message).not.toContain('Erro técnico');
    });

    test('retorna HTTP 404 para P2025', () => {
        // P2025 representa uma operação que não encontrou o registro necessário no banco de dados.
        const res = executeErrorHandler({
            code: 'P2025',
        });

        // HTTP 404 indica recurso não encontrado.
        expect(res.statusCode).toBe(404);
        expect(res.body.message).toBe('Registro não encontrado.');
    });

    test('retorna HTTP 503 para P2024', () => {
        // P2024 está relacionado ao tempo limite para obter uma conexão do pool de conexões do Prisma.
        const res = executeErrorHandler({
            code: 'P2024',
        });

        // HTTP 503 indica indisponibilidade temporária do serviço.
        expect(res.statusCode).toBe(503);
    });

    test('mantém compatibilidade com o código 11000', () => {
        // Simula um erro no formato legado de duplicidade.
        const res = executeErrorHandler({
            code: 11000,
            keyValue: { email: 'duplicado' },
        });

        // Mesmo utilizando o código antigo, a API deve continuar respondendo com HTTP 409.
        expect(res.statusCode).toBe(409);
    });

    test('respeita erros operacionais de domínio', () => {
        // Cria um erro personalizado definido pelas regras de negócio da aplicação, neste caso CPF duplicado.
        const error = new CustomError({
            statusCode: 409,
            errorType: 'cpfAlreadyExists',
            field: 'cpf',
            customMessage: 'CPF já cadastrado.',
        });

        const res = executeErrorHandler(error);

        // O middleware deve respeitar o status e a mensagem definidos no erro personalizado.
        expect(res.statusCode).toBe(409);
        expect(res.body.message).toBe('CPF já cadastrado.');
    });

    test('retorna 500 para código Prisma desconhecido', () => {
        // Guarda o ambiente atual para restaurá-lo depois.
        const originalEnvironment = process.env.NODE_ENV;

        try {
            // Simula o ambiente de produção, no qual informações internas não devem ser expostas ao cliente.
            process.env.NODE_ENV = 'production';

            // Cria um Error comum e adiciona um código Prisma desconhecido utilizando Object.assign().
            const res = executeErrorHandler(
                Object.assign(new Error('Detalhes internos do banco'), {
                    code: 'P9999',
                })
            );

            // Erros desconhecidos devem gerar HTTP 500.
            expect(res.statusCode).toBe(500);

            // Transforma o corpo da resposta em texto para verificar se existem informações internas.
            const response = JSON.stringify(res.body);

            // A resposta não deve revelar detalhes técnicos, códigos desconhecidos ou o stack trace do erro.
            expect(response).not.toContain('Detalhes internos do banco');
            expect(response).not.toContain('P9999');
            expect(response).not.toContain('stack');
        } finally {
            // Restaura o ambiente original mesmo se algum expect falhar ou ocorrer uma exceção.
            process.env.NODE_ENV = originalEnvironment;
        }
    });
});
