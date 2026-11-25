import express from "express";
import { asyncWrapper } from "../utils/helpers/index.js";
import CategoriaController from "../controllers/CategoriaController.js";
import AuthMiddleware from "../middlewares/AuthMiddleware.js";
import authorize from "../middlewares/authorize.js";
import EnsureCompleteRegistrationMiddleware from "../middlewares/EnsureCompleteRegistrationMiddleware.js";

const router = express.Router();
const ControCategoria = new CategoriaController();

const adminOnly = [AuthMiddleware, EnsureCompleteRegistrationMiddleware, authorize("ADMINISTRADOR")];

router
  .get("/categorias", asyncWrapper(ControCategoria.listar))

  .get("/categorias/:id", asyncWrapper(ControCategoria.buscarPorId))

  .post("/categorias", ...adminOnly, asyncWrapper(ControCategoria.criar))

  .put("/categorias/:id", ...adminOnly, asyncWrapper(ControCategoria.atualizar))

  .delete("/categorias/:id", ...adminOnly, asyncWrapper(ControCategoria.deletar));

export default router;