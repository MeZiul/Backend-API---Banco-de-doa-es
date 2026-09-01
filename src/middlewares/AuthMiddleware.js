// src/middlewares/AuthMiddleware.js
import { auth } from "../config/betterAuth.js";
import UsuarioRepository from "../repositories/UsuarioRepository.js";
import { createAuthMiddleware } from "./createAuthMiddleware.js";

const usuarioRepository = new UsuarioRepository();

const AuthMiddleware = createAuthMiddleware({
  authClient: auth,
  usuarioRepository,
  requireActive: true,
});

const SessionAuthMiddleware = createAuthMiddleware({
  authClient: auth,
  usuarioRepository,
  requireActive: false,
});

export { SessionAuthMiddleware };
export default AuthMiddleware;
