import AuthenticationError from "../../utils/errors/AuthenticationError.js";

const decodeTestToken = (value) => {
  const token = value?.replace(/^Bearer\s+/i, "").trim();
  if (!token) return null;

  try {
    return { token, user: JSON.parse(Buffer.from(token, "base64url").toString("utf8")) };
  } catch {
    return null;
  }
};

const testAuthMiddleware = (req, _res, next) => {
  const decoded = decodeTestToken(req.headers?.authorization);
  if (!decoded?.user?.id) {
    return next(new AuthenticationError("Token inválido ou expirado. Faça login novamente."));
  }

  req.user = decoded.user;
  req.auth = {
    session: { token: decoded.token, userId: decoded.user.id },
    user: { id: decoded.user.id },
  };
  return next();
};

export const SessionAuthMiddleware = testAuthMiddleware;
export default testAuthMiddleware;
