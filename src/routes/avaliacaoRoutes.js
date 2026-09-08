import express from "express";
import { asyncWrapper } from "../utils/helpers/index.js";
import AvaliacaoController from "../controllers/AvaliacaoController.js";
import AuthMiddleware from "../middlewares/AuthMiddleware.js";

const router = express.Router();
const ControAvaliacao = new AvaliacaoController();

router

  .get("/avaliacoes",     AuthMiddleware, asyncWrapper(ControAvaliacao.listar))

  .get("/avaliacoes/:id", AuthMiddleware, asyncWrapper(ControAvaliacao.buscarPorId))

  .post("/avaliacoes",    AuthMiddleware, asyncWrapper(ControAvaliacao.criar))

  .put("/avaliacoes/:id",    AuthMiddleware, asyncWrapper(ControAvaliacao.atualizar))

  .delete("/avaliacoes/:id", AuthMiddleware, asyncWrapper(ControAvaliacao.deletar));

export default router;
