import express from 'express';

import PerfilController from '../controllers/PerfilController.js';
import AuthMiddleware from "../middlewares/AuthMiddleware.js";
import EnsureAdminMiddleware from "../middlewares/EnsureAdminMiddleware.js";
import EnsureActiveUserMiddleware from "../middlewares/EnsureActiveUserMiddleware.js";
import PreventEscalationMiddleware from "../middlewares/PreventEscalationMiddleware.js";
import { asyncWrapper } from "../utils/helpers/index.js";
import EnsureCompleteRegistrationMiddleware from "../middlewares/EnsureCompleteRegistrationMiddleware.js";

const router = express.Router();
const activeUserOnly = [AuthMiddleware, EnsureCompleteRegistrationMiddleware];

router
    .get("/perfil", AuthMiddleware, asyncWrapper(PerfilController.buscar))
    .put("/perfil", ...activeUserOnly, asyncWrapper(PerfilController.atualizar))
    .patch("/perfil/completar-cadastro", AuthMiddleware, asyncWrapper(PerfilController.completarCadastro))
    .delete("/perfil", AuthMiddleware, asyncWrapper(PerfilController.desativar))
    .patch(
        "/admin/usuarios/:id/perfil",
        ...activeUserOnly,
        EnsureActiveUserMiddleware,
        EnsureAdminMiddleware,
        PreventEscalationMiddleware,
        PerfilController.gerenciarAcesso
    );

export default router;