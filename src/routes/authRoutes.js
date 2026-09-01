import express from "express";
import { asyncWrapper } from "../utils/helpers/index.js";
import AutenticacaoController from "../controllers/AutenticacaoController.js";
import AuthMiddleware, { SessionAuthMiddleware } from "../middlewares/AuthMiddleware.js";
import { loginLimiter, forgotPasswordLimiter } from "../middlewares/rateLimiters.js";

const router = express.Router();
const AuthController = new AutenticacaoController();

router
  .post("/auth/login", loginLimiter, asyncWrapper(AuthController.login))

  .post("/auth/esqueci-senha", forgotPasswordLimiter, asyncWrapper(AuthController.esqueciSenha))

  .put("/auth/redefinir-senha", asyncWrapper(AuthController.redefinirSenha))

  .post("/auth/logout", SessionAuthMiddleware, asyncWrapper(AuthController.logout))

  .post("/auth/refresh-token", AuthMiddleware, asyncWrapper(AuthController.refreshToken));

export default router;
