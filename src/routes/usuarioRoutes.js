import express from "express";
import { asyncWrapper } from "../utils/helpers/index.js";
import UsuarioController from "../controllers/UsuarioController.js";
import AuthMiddleware from "../middlewares/AuthMiddleware.js";
import authorize from "../middlewares/authorize.js";

const router = express.Router();
const ControllerUser = new UsuarioController();

router
  .post("/usuario", asyncWrapper(ControllerUser .cadastrar))

  .get("/usuario", AuthMiddleware, asyncWrapper(ControllerUser.listar))

  .get("/usuario/:id/itens", AuthMiddleware, asyncWrapper(ControllerUser.listarItens))

  .get("/usuario/:id/avaliacoes", AuthMiddleware, asyncWrapper(ControllerUser.listarAvaliacoes))

  .patch("/usuario/:id/suspender", AuthMiddleware, authorize("ADMINISTRADOR"), asyncWrapper(ControllerUser.suspender))

  .patch("/usuario/:id/reativar", AuthMiddleware, authorize("ADMINISTRADOR"), asyncWrapper(ControllerUser.reativar))


  .get("/usuario/:id", AuthMiddleware, asyncWrapper(ControllerUser.buscarPorId))

  .put("/usuario/:id", AuthMiddleware, asyncWrapper(ControllerUser.atualizar))

  .patch("/usuario/:id", AuthMiddleware, asyncWrapper(ControllerUser.atualizarParcial))

  .delete("/usuario/:id", AuthMiddleware, asyncWrapper(ControllerUser.excluir));



  


export default router;