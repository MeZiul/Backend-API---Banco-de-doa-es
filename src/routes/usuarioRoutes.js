import express from "express";
import { asyncWrapper } from "../utils/helpers/index.js";
import UsuarioController from "../controllers/UsuarioController.js";
import AuthMiddleware from "../middlewares/AuthMiddleware.js";
import authorize from "../middlewares/authorize.js";
import EnsureCompleteRegistrationMiddleware from "../middlewares/EnsureCompleteRegistrationMiddleware.js";

const router = express.Router();
const ControllerUser = new UsuarioController();
const activeUserOnly = [AuthMiddleware, EnsureCompleteRegistrationMiddleware];

router
  .post("/usuario", asyncWrapper(ControllerUser.cadastrar))

  .get("/usuario", ...activeUserOnly, asyncWrapper(ControllerUser.listar))

  .get("/usuario/:id/itens", ...activeUserOnly, asyncWrapper(ControllerUser.listarItens))

  .get("/usuario/:id/avaliacoes", ...activeUserOnly, asyncWrapper(ControllerUser.listarAvaliacoes))

  .patch("/usuario/:id/suspender", ...activeUserOnly, authorize("ADMINISTRADOR"), asyncWrapper(ControllerUser.suspender))

  .patch("/usuario/:id/reativar", ...activeUserOnly, authorize("ADMINISTRADOR"), asyncWrapper(ControllerUser.reativar))


  .get("/usuario/:id", ...activeUserOnly, asyncWrapper(ControllerUser.buscarPorId))

  .put("/usuario/:id", ...activeUserOnly, asyncWrapper(ControllerUser.atualizar))

  .patch("/usuario/:id", ...activeUserOnly, asyncWrapper(ControllerUser.atualizarParcial))

  .delete("/usuario/:id", ...activeUserOnly, asyncWrapper(ControllerUser.excluir));

export default router;