// src/utils/helpers/errorHandler.js

import { ZodError } from 'zod';
import multer from 'multer';
import logger from '../logger.js';
import CommonResponse from './CommonResponse.js';
import StatusService from './StatusService.js';
import { v4 as uuidv4 } from 'uuid';
import mongoose from 'mongoose';
import AuthenticationError from '../errors/AuthenticationError.js';
import CustomError from './CustomError.js';

/**
 * Middleware para tratamento centralizado de erros.
 * Identifica o tipo de erro e envia uma resposta padronizada ao cliente.
 * 
 */
const errorHandler = (err, req, res, next) => {
  // Verifica se o ambiente é de produção para ajustar a mensagem de erro
  const isProduction = process.env.NODE_ENV === 'production';
  // Gera um ID único para identificar o erro (útil para logs)
  const errorId = uuidv4();
  const requestId = req.requestId || 'N/A';

  // Tratamento para erros do Multer (upload de arquivos)
  if (err instanceof multer.MulterError) {
    logger.warn('Erro de upload (Multer)', { code: err.code, message: err.message, path: req.path, requestId });
    let mensagem = 'Erro no upload do arquivo.';
    if (err.code === 'LIMIT_FILE_SIZE') {
      mensagem = 'Arquivo muito grande. Tamanho máximo permitido: 50MB.';
    } else if (err.code === 'LIMIT_UNEXPECTED_FILE') {
      mensagem = 'Campo de arquivo inesperado.';
    } else if (err.code === 'LIMIT_FILE_COUNT') {
      mensagem = 'Muitos arquivos enviados.';
    }
    return CommonResponse.error(
      res,
      400,
      'uploadError',
      'avatar',
      [{ message: mensagem }],
      mensagem
    );
  }

  // Tratamento para erros de fileFilter do multer (lançados manualmente)
  if (err.message && err.message.includes('Tipo de arquivo não permitido')) {
    logger.warn('Erro de tipo de arquivo', { message: err.message, path: req.path, requestId });
    return CommonResponse.error(
      res,
      400,
      'uploadError',
      'avatar',
      [{ message: err.message }],
      err.message
    );
  }

  // Tratamento para erros de validação do Zod
  if (err instanceof ZodError) {
    logger.warn('Erro de validação', { errors: err.errors, path: req.path, requestId });
    return CommonResponse.error(
      res,
      400,
      'validationError',
      null,
      err.errors.map(e => ({ path: e.path.join('.'), message: e.message })),
      `Erro de validação. ${err.errors.length} campo(s) inválido(s).`
    );
  }

  // Tratamento para erro de chave duplicada no MongoDB (código 11000)
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0];
    const value = err.keyValue ? err.keyValue[field] : 'duplicado';
    logger.warn('Erro de chave duplicada', { field, value, path: req.path, requestId });
    return CommonResponse.error(
      res,
      409,
      'duplicateEntry',
      field,
      [{ path: field, message: `O valor "${value}" já está em uso.` }],
      `Entrada duplicada no campo "${field}".`
    );
  }

  // Tratamento para erros de validação do Mongoose
  if (err instanceof mongoose.Error.ValidationError) {
    const detalhes = Object.values(err.errors).map(e => ({ path: e.path, message: e.message }));
    logger.warn('Erro de validação do Mongoose', { details: detalhes, path: req.path, requestId });
    return CommonResponse.error(res, 400, 'validationError', null, detalhes);
  }

  // Tratamento para erros de autenticação customizados
  if (err instanceof AuthenticationError) {
    logger.warn('Erro de autenticação', { message: err.message, path: req.path, requestId });
    return CommonResponse.error(
      res,
      err.statusCode,
      'authenticationError',
      null,
      [{ message: err.message }],
      err.message
    );
  }

  // Tratamento específico para CustomError com errorType 'tokenExpired'
  if (err instanceof CustomError && err.errorType === 'tokenExpired') {
    logger.warn('Erro de token expirado', { message: err.message, path: req.path, requestId });
    return CommonResponse.error(
      res,
      err.statusCode || 401,
      'tokenExpired',
      null,
      [{ message: err.customMessage || 'Token expirado.' }],
      err.customMessage || 'Token expirado. Por favor, faça login novamente.'
    );
  }

  // Tratamento para erros operacionais (erros esperados na aplicação)
  if (err.isOperational) {
    logger.warn('Erro operacional', { message: err.message, path: req.path, requestId });
    return CommonResponse.error(
      res,
      err.statusCode,
      err.errorType || 'operationalError',
      err.field || null,
      err.details || [],
      err.customMessage || 'Erro operacional.'
    );
  }

  // Tratamento para erros internos (não operacionais)
  logger.error(`Erro interno [ID: ${errorId}]`, { message: err.message, stack: err.stack, requestId });
  const detalhes = isProduction
    ? [{ message: `Erro interno do servidor. Referência: ${errorId}` }]
    : [{ message: err.message, stack: err.stack }];

  return CommonResponse.error(res, 500, 'serverError', null, detalhes);
};

export default errorHandler;
