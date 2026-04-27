// src/middlewares/AuthMiddleware.js
import jwt from 'jsonwebtoken';
import AuthenticationError from '../utils/errors/AuthenticationError.js';
import { CustomError } from '../utils/helpers/index.js';

class AuthMiddleware {
  constructor() {
    this.handle = this.handle.bind(this);
  }

  _getTokenAndType(req) {
    const authHeader = req.headers?.authorization ?? null;
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

  _getJwtSecret(type) {
    if (type === 'recovery') {
    return process.env.JWT_SECRET_PASSWORD_RECOVERY || process.env.JWT_SECRET_ACCESS_TOKEN;
    }
    return process.env.JWT_SECRET_ACCESS_TOKEN || process.env.JWT_SECRET;
  }

  async handle(req, res, next) {
    try {
      const { token, type } = this._getTokenAndType(req);
      const secret = this._getJwtSecret(type);

      if (!secret) {
        throw new CustomError({
          statusCode: 500,
          customMessage: 'Segredo JWT nao configurado.',
        });
      }

      const decoded = jwt.verify(token, secret);

      if (!decoded) {
        throw new AuthenticationError('Token JWT expirado, tente novamente.');
      }

      req.user = {
        id: decoded.id || decoded.userId || decoded._id || null,
        nome: decoded.nome || null,
        email: decoded.email || null,
        perfil: decoded.perfil || null,
        papeis: decoded.papeis || (decoded.perfil ? [decoded.perfil] : []),
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
