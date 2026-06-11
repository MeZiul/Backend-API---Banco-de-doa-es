import express from "express";
import AdministracaoController from "../controllers/AdministracaoController.js";
import AuthMiddleware from "../middlewares/AuthMiddleware.js";
import EnsureActiveUserMiddleware from "../middlewares/EnsureActiveUserMiddleware.js";
import EnsureAdminMiddleware from "../middlewares/EnsureAdminMiddleware.js";
import { asyncWrapper } from "../utils/helpers/index.js";

const router = express.Router();
const adminOnly = [AuthMiddleware, EnsureActiveUserMiddleware, EnsureAdminMiddleware];

router
    .get("/admin/administracoes", ...adminOnly, asyncWrapper(AdministracaoController.listar))
    .get("/admin/administracoes/:id", ...adminOnly, asyncWrapper(AdministracaoController.buscarPorId))
    .get("/admin/alvos/:alvoId/administracoes", ...adminOnly, asyncWrapper(AdministracaoController.listarPorAlvo))
    .get("/admin/administradores/:administradorId/administracoes", ...adminOnly, asyncWrapper(AdministracaoController.listarPorAdministrador))
    .get("/admin/usuarios", ...adminOnly, asyncWrapper(AdministracaoController.listarUsuarios))
    .get("/admin/usuarios/:id", ...adminOnly, asyncWrapper(AdministracaoController.buscarUsuarioPorId))
    .put("/admin/usuarios/:id/bloquear", ...adminOnly, asyncWrapper(AdministracaoController.bloquearUsuario))
    .put("/admin/usuarios/:id/desbloquear", ...adminOnly, asyncWrapper(AdministracaoController.desbloquearUsuario))
    .delete("/admin/usuarios/:id", ...adminOnly, asyncWrapper(AdministracaoController.inativarUsuario))
    .put("/admin/usuarios/:id/inativar", ...adminOnly, asyncWrapper(AdministracaoController.inativarUsuario))
    .get("/admin/itens", ...adminOnly, asyncWrapper(AdministracaoController.listarItens))
    .delete("/admin/itens/:id", ...adminOnly, asyncWrapper(AdministracaoController.cancelarItem))
    .put("/admin/itens/:id/cancelar", ...adminOnly, asyncWrapper(AdministracaoController.cancelarItem))
    .get("/admin/denuncias", ...adminOnly, asyncWrapper(AdministracaoController.listarDenuncias))
    .put("/admin/denuncias/:id/resolver", ...adminOnly, asyncWrapper(AdministracaoController.resolverDenuncia));

export default router;
