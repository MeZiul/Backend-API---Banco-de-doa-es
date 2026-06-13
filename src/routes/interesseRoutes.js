import express from "express";
import InteresseController from "../controllers/InteresseController.js";
import AuthMiddleware from "../middlewares/AuthMiddleware.js";
import EnsureActiveUserMiddleware from "../middlewares/EnsureActiveUserMiddleware.js";
import { asyncWrapper } from "../utils/helpers/index.js";

const router = express.Router();
const activeUserOnly = [AuthMiddleware, EnsureActiveUserMiddleware];

router
    .post("/interesses", ...activeUserOnly, asyncWrapper(InteresseController.criar))
    .get("/interesses", ...activeUserOnly, asyncWrapper(InteresseController.listar))
    .get("/interesses/recebidos", ...activeUserOnly, asyncWrapper(InteresseController.listarRecebidos))
    .get("/interesses/:id", ...activeUserOnly, asyncWrapper(InteresseController.buscarPorId))
    .put("/interesses/:id/aceitar", ...activeUserOnly, asyncWrapper(InteresseController.aceitar))
    .put("/interesses/:id/recusar", ...activeUserOnly, asyncWrapper(InteresseController.recusar))
    .delete("/interesses/:id", ...activeUserOnly, asyncWrapper(InteresseController.cancelar));

export default router;
