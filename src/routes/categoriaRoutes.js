import express from "express";
import {asyncWrapper} from "../utils/helpers/index.js";

import CategoriaController from "../controllers/CategoriaController.js";
import AuthMiddleware from "../middlewares/AuthMiddleware.js";
import authorize from "../middlewares/authorize.js";

const router = express.Router();
const ControCategoria = new CategoriaController();

router
  .get("/categorias",       asyncWrapper(ControCategoria .listar))

  .get("/categorias/:id",   asyncWrapper(ControCategoria.buscarPorId))

  .post("/categorias",      AuthMiddleware, authorize("ADMINISTRADOR"), asyncWrapper(ControCategoria.criar))
  
  .put("/categorias/:id",   AuthMiddleware, authorize("ADMINISTRADOR"), asyncWrapper(ControCategoria.atualizar))
 
  .delete("/categorias/:id", AuthMiddleware, authorize("ADMINISTRADOR"), asyncWrapper(ControCategoria.deletar));

export default router;