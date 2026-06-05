import express from 'express';
import PerfilController from '../controllers/PerfilController.js';
import AuthMiddleware from "../middlewares/AuthMiddleware.js";

const router = express.Router();
router.patch("/admin/usuarios/:id/perfil", AuthMiddleware, PerfilController.gerenciarAcesso);

export default router;