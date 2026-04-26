import express from "express";
import DenunciaController from "../controllers/DenunciaController.js";
import AuthMiddleware from "../middlewares/AuthMiddleware.js";
import { asyncWrapper } from "../utils/helpers/index.js";

const router = express.Router();

router
    .post("/denuncias", AuthMiddleware, asyncWrapper(DenunciaController.criar))
    .get("/denuncias", AuthMiddleware, asyncWrapper(DenunciaController.listar))
    .get("/denuncias/:id", AuthMiddleware, asyncWrapper(DenunciaController.buscarPorId))
    .put("/denuncias/:id", AuthMiddleware, asyncWrapper(DenunciaController.atualizar))
    .delete("/denuncias/:id", AuthMiddleware, asyncWrapper(DenunciaController.deletar));

export default router;
