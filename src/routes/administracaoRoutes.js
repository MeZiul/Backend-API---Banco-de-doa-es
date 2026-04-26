import express from "express";
import AdministracaoController from "../controllers/AdministracaoController.js";
import AuthMiddleware from "../middlewares/AuthMiddleware.js";
import { asyncWrapper } from "../utils/helpers/index.js";

const router = express.Router();

router
    .get("/administracoes", AuthMiddleware, asyncWrapper(AdministracaoController.listar))
    .get("/administracoes/:id", AuthMiddleware, asyncWrapper(AdministracaoController.buscarPorId))
    .get("/administracoes/alvo/:alvoId", AuthMiddleware, asyncWrapper(AdministracaoController.listarPorAlvo))
    .get("/administracoes/administrador/:administradorId", AuthMiddleware, asyncWrapper(AdministracaoController.listarPorAdministrador))
    .put("/admin/usuarios/:id/bloquear", AuthMiddleware, asyncWrapper(AdministracaoController.bloquearUsuario))
    .put("/admin/usuarios/:id/desbloquear", AuthMiddleware, asyncWrapper(AdministracaoController.desbloquearUsuario))
    .delete("/admin/usuarios/:id", AuthMiddleware, asyncWrapper(AdministracaoController.inativarUsuario))
    .delete("/admin/itens/:id", AuthMiddleware, asyncWrapper(AdministracaoController.cancelarItem))
    .put("/admin/denuncias/:id/resolver", AuthMiddleware, asyncWrapper(AdministracaoController.resolverDenuncia));

export default router;
