import express from "express";
import { asyncWrapper } from "../utils/helpers/index.js";
import AvaliacaoController from "../controllers/AvaliacaoController.js";
import AuthMiddleware from "../middlewares/AuthMiddleware.js";
import EnsureCompleteRegistrationMiddleware from "../middlewares/EnsureCompleteRegistrationMiddleware.js";

const router = express.Router();
const ControAvaliacao = new AvaliacaoController();
const activeUserOnly = [AuthMiddleware, EnsureCompleteRegistrationMiddleware];

router

  .get("/avaliacoes", ...activeUserOnly, asyncWrapper(ControAvaliacao.listar))

  .get("/avaliacoes/:id", ...activeUserOnly, asyncWrapper(ControAvaliacao.buscarPorId))

  .post("/avaliacoes", ...activeUserOnly, asyncWrapper(ControAvaliacao.criar))

  .put("/avaliacoes/:id", ...activeUserOnly, asyncWrapper(ControAvaliacao.atualizar))

  .delete("/avaliacoes/:id", ...activeUserOnly, asyncWrapper(ControAvaliacao.deletar));

export default router;
