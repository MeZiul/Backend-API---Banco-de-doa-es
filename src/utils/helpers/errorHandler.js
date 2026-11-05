import { ZodError } from 'zod-v3';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';

import logger from '../logger.js';
import CommonResponse from './CommonResponse.js';
import AuthenticationError from '../errors/AuthenticationError.js';
import CustomError from './CustomError.js';
import { mapPrismaError } from '../errors/prismaErrorMapper.js';

/** Responsabilidades:
 * - Identificar erros conhecidos da aplicação;
 * - Converter erros do Prisma para respostas HTTP;
 * - Preservar compatibilidade com erros legados;
 * - Padronizar respostas utilizando CommonResponse;
 * - Registrar informações de diagnóstico;
 * - Evitar a exposição de informações internas em produção.
 */
const errorHandler = (err, req, res, next) => {
  const isProduction = process.env.NODE_ENV === 'production';

  // Identificadores utilizados para rastrear erros nos logs.
  const errorId = uuidv4();
  const requestId = req.requestId || 'N/A';

  // Trata erros conhecidos durante o envio de arquivos.
  if (err instanceof multer.MulterError) {
    logger.warn('Erro de upload (Multer)', {
      code: err.code,
      message: err.message,
      path: req.path,
      requestId
    });

    let mensagem = 'Erro no upload do arquivo';

    if (err.code === 'LIMIT_FILE_SIZE') { mensagem = 'Arquivo muito grande. Tamanho máximo permitido: 5MB'; }

    else if (err.code === 'LIMIT_UNEXPECTED_FILE') { mensagem = 'Campo de arquivo inesperado'; }

    else if (err.code === 'LIMIT_FILE_COUNT') { mensagem = 'Muitos arquivos enviados'; }

    return CommonResponse.error(res, 400, 'uploadError', 'avatar',
      [{ message: mensagem }],
      mensagem
    );
  }

  // Trata rejeições realizadas pelo fileFilter do Multer.
  if (typeof err?.message === 'string' && err.message.includes('Tipo de arquivo não permitido')) {
    logger.warn('Erro de tipo de arquivo', {
      message: err.message,
      path: req.path,
      requestId
    });

    return CommonResponse.error(res, 400, 'uploadError', 'avatar',
      [{ message: err.message }],
      err.message
    );
  }

  //Retorna os campos que não passaram na validação.
  if (err instanceof ZodError) {
    const detalhes = err.errors.map((error) => ({
      path: error.path.join(''),
      message: error.message
    }));

    logger.warn('Erro de validação', {
      errors: detalhes,
      path: req.path,
      requestId
    });

    return CommonResponse.error(res, 400, 'validationError', null, detalhes,
      `Erro de validação. ${detalhes.length} campo(s) inválido(s)`
    );
  }

  /** Alguns repositories ainda convertem o erro P2002
   * do Prisma para o código 11000, originalmente
   * utilizado pelo MongoDB.
   *
   * Este tratamento deverá ser removido quando
   * a migração dos erros legados estiver concluída.
   */
  if (err?.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0] || null;

    const mensagem = field
      ? `Já existe um registro com o campo "${field}" informado`
      : 'Já existe um registro com os dados informados';

    logger.warn('Erro de chave duplicada (legado)', {
      field,
      code: err.code,
      path: req.path,
      requestId
    });

    return CommonResponse.error(res, 409, 'duplicateEntry', field,
      [{ path: field, message: mensagem }],
      mensagem
    );
  }

  /** Utiliza o prismaErrorMapper para converter códigos
   * conhecidos em erros operacionais da aplicação.
   *
   * Exemplos:
   * P2000 -> HTTP 400
   * P2002 -> HTTP 409
   * P2003 -> HTTP 409
   * P2014 -> HTTP 409
   * P2024 -> HTTP 503
   * P2025 -> HTTP 404
   * P2034 -> HTTP 409
   *
   * Erros não mapeados continuam para os tratamentos
   * posteriores, podendo resultar em HTTP 500.
   */
  const prismaError = mapPrismaError(err);

  if (prismaError) {
    logger.warn('Erro conhecido do Prisma', {
      code: err.code,
      errorType: prismaError.errorType,
      statusCode: prismaError.statusCode,
      path: req.path,
      requestId
    });

    return CommonResponse.error(
      res,
      prismaError.statusCode,
      prismaError.errorType,
      prismaError.field || null,
      prismaError.details || [],
      prismaError.customMessage
    );
  }

  // Trata erros específicos da camada de autenticação.
  if (err instanceof AuthenticationError) {
    logger.warn('Erro de autenticação', {
      message: err.message,
      path: req.path,
      requestId
    });

    return CommonResponse.error(res, err.statusCode || 401, 'authenticationError', null,
      [{ message: err.message }],
      err.message
    );
  }

  // Tratamento específico para CustomError com o identificador tokenExpired.
  if (err instanceof CustomError && err.errorType === 'tokenExpired') {
    const mensagem = err.customMessage || 'Token expirado. Por favor, faça login novamente';

    logger.warn('Token expirado', {
      path: req.path,
      requestId
    });

    return CommonResponse.error(res, err.statusCode || 401, 'tokenExpired', null,
      [{ message: mensagem }],
      mensagem
    );
  }

  /** São erros definidos pela aplicação.
   *
   * Exemplos:
   * - Usuário não encontrado;
   * - CPF inválido;
   * - E-mail já cadastrado;
   * - Operação não permitida.
   */
  if (err?.isOperational) {
    const statusCode = err.statusCode || 500;

    const mensagem =
      err.customMessage ||
      (statusCode >= 500
        ? 'Não foi possível concluir a operação'
        : err.message || 'Erro operacional');

    logger.warn('Erro operacional', {
      errorType: err.errorType,
      statusCode,
      path: req.path,
      requestId
    });

    return CommonResponse.error(
      res,
      statusCode,
      err.errorType || 'operationalError',
      err.field || null,
      err.details || [],
      mensagem
    );
  }

  /** Erros inesperados devem retornar HTTP 500.
   *
   * Em produção:
   * - Não expõe stack trace;
   * - Não expõe mensagens internas;
   * - Disponibiliza um identificador para rastreamento.
   *
   * Em desenvolvimento:
   * - Disponibiliza informações técnicas para depuração.
   */
  logger.error(`Erro interno [ID: ${errorId}]`, {
    message: err?.message,
    stack: err?.stack,
    path: req.path,
    requestId,
    errorId
  });

  const detalhes = isProduction
    ? [{ message: `Erro interno do servidor. Referência: ${errorId}` }]
    : [{ message: err?.message || 'Erro desconhecido', stack: err?.stack }];

  return CommonResponse.error(res, 500, 'serverError', null, detalhes,
    'Erro interno do servidor'
  );
};

export default errorHandler;