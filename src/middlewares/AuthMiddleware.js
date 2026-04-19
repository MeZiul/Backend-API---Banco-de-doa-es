// src/middlewares/AuthMiddleware.js
import { tokenService, sessionService } from '../containers/services.index.js';
import AuthenticationError from '../utils/errors/AuthenticationError.js';
import { CustomError } from '../utils/helpers/index.js';

class AuthMiddleware {
  constructor() {
    this.handle = this.handle.bind(this);
  }

  _getTokenAndType(req) {
    const authHeader = req.headers?.authorization ?? null;
    console.log('[AuthMiddleware] Headers recebidos:', JSON.stringify(req.headers, null, 2));
    console.log('[AuthMiddleware] Authorization header:', authHeader);
    if (authHeader) {
      const parts = authHeader.split(' ');
      const token = parts.length === 2 ? parts[1] : parts[0];
      return { token, type: 'access' };
    }
    if (req.query?.token) {
      return { token: req.query.token, type: 'recovery' };
    }
    throw new AuthenticationError('Token nao informado!');
  }

  async handle(req, res, next) {
    try {
      const { token, type } = this._getTokenAndType(req);
      const decoded = type === 'access'
        ? tokenService.verifyAccessToken(token)
        : tokenService.verifyPasswordRecoveryToken(token);
      if (!decoded) {
        throw new AuthenticationError('Token JWT expirado, tente novamente.');
      }
      if (type === 'access') {
        const sessaoAtiva = await sessionService.verificarSessaoAtiva(decoded.id);
        if (!sessaoAtiva) {
          throw new CustomError({
            statusCode: 401,
            errorType: 'unauthorized',
            field: 'Token',
            details: [],
            customMessage: 'Sessao expirada, autentique-se novamente!'
          });
        }
      }
      req.user = {
        id: decoded.id,
        papeis: decoded.papeis || [],
        instituicaoId: decoded.instituicaoId || null,
      };
      next();
    } catch (err) {
      if (err.name === 'JsonWebTokenError') {
        return next(new AuthenticationError('Token JWT invalido!'));
      }
      if (err.name === 'TokenExpiredError') {
        return next(new AuthenticationError('Token JWT expirado, faca login novamente.'));
      }
      return next(err);
    }
  }
}

export default new AuthMiddleware().handle;
