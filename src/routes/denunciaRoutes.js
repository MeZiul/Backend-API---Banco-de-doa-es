import express from "express";
import DenunciaController from "../controllers/DenunciaController.js";
import AuthMiddleware from "../middlewares/AuthMiddleware.js";
import EnsureActiveUserMiddleware from "../middlewares/EnsureActiveUserMiddleware.js";
import { asyncWrapper } from "../utils/helpers/index.js";

const router = express.Router();
const activeUserOnly = [AuthMiddleware, EnsureActiveUserMiddleware];

router
    .post("/denuncias", ...activeUserOnly, asyncWrapper(DenunciaController.criar))
    .get("/denuncias", ...activeUserOnly, asyncWrapper(DenunciaController.listar))
    .get("/denuncias/:id", ...activeUserOnly, asyncWrapper(DenunciaController.buscarPorId))
    .put("/denuncias/:id", ...activeUserOnly, asyncWrapper(DenunciaController.atualizar))
    .delete("/denuncias/:id", ...activeUserOnly, asyncWrapper(DenunciaController.deletar));

export default router;
