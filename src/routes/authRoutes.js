import express from "express";
import { asyncWrapper } from "../utils/helpers/index.js";
import AutenticacaoController from "../controllers/AutenticacaoController.js";
import AuthMiddleware from "../middlewares/AuthMiddleware.js";

const router = express.Router();
const AuthController = new AutenticacaoController();

router
  .post("/auth/login", asyncWrapper(AuthController.login))

  .post("/auth/esqueci-senha", asyncWrapper(AuthController.esqueciSenha))

  .put("/auth/redefinir-senha", asyncWrapper(AuthController.redefinirSenha))

  .post("/auth/logout", AuthMiddleware, asyncWrapper(AuthController.logout))

  .post("/auth/refresh-token", AuthMiddleware, asyncWrapper(AuthController.refreshToken));

export default router;