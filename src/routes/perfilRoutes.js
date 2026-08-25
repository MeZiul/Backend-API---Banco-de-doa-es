import express from 'express';

import PerfilController from '../controllers/PerfilController.js';
import AuthMiddleware from "../middlewares/AuthMiddleware.js";
import EnsureAdminMiddleware from "../middlewares/EnsureAdminMiddleware.js";
import EnsureActiveUserMiddleware from "../middlewares/EnsureActiveUserMiddleware.js";
import PreventEscalationMiddleware from "../middlewares/PreventEscalationMiddleware.js";
import { asyncWrapper } from "../utils/helpers/index.js";

const router = express.Router();

router
    .get("/perfil", AuthMiddleware, asyncWrapper(PerfilController.buscar))
    .put("/perfil", AuthMiddleware, asyncWrapper(PerfilController.atualizar))
    .delete("/perfil", AuthMiddleware, asyncWrapper(PerfilController.desativar))
    .patch(
        "/admin/usuarios/:id/perfil",
        AuthMiddleware,
        EnsureActiveUserMiddleware,
        EnsureAdminMiddleware,
        PreventEscalationMiddleware,
        PerfilController.gerenciarAcesso
    );

export default router;