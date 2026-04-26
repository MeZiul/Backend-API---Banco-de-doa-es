import express from "express";
import InteresseController from "../controllers/InteresseController.js";
import AuthMiddleware from "../middlewares/AuthMiddleware.js";
import { asyncWrapper } from "../utils/helpers/index.js";

const router = express.Router();

router
    .post("/interesses", AuthMiddleware, asyncWrapper(InteresseController.criar))
    .get("/interesses", AuthMiddleware, asyncWrapper(InteresseController.listar))
    .get("/interesses/:id", AuthMiddleware, asyncWrapper(InteresseController.buscarPorId))
    .put("/interesses/:id/aceitar", AuthMiddleware, asyncWrapper(InteresseController.aceitar))
    .put("/interesses/:id/recusar", AuthMiddleware, asyncWrapper(InteresseController.recusar))
    .delete("/interesses/:id", AuthMiddleware, asyncWrapper(InteresseController.cancelar));

export default router;
