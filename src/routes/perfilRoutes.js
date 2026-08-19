import express from "express";
import PerfilController from "../controllers/PerfilController.js";
import AuthMiddleware from "../middlewares/AuthMiddleware.js";
import EnsureActiveUserMiddleware from "../middlewares/EnsureActiveUserMiddleware.js";
import EnsureAdminMiddleware from "../middlewares/EnsureAdminMiddleware.js";

const router = express.Router();

router.patch(
  "/admin/usuarios/:id/perfil",
  AuthMiddleware,
  EnsureActiveUserMiddleware,
  EnsureAdminMiddleware,
  PerfilController.gerenciarAcesso
);

export default router;