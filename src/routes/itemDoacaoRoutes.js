import express from 'express';
import ItemDoacaoController from '../controllers/ItemDoacaoController';
import AuthMiddleware from "../middlewares/AuthMiddleware.js";
import { asyncWrapper } from "../utils/helpers/index.js";

const router = express.Router();

router
    .get("/itemDoacao", asyncWrapper(ItemDoacaoController.listar))
    .get ("/itemDoacao/:id", asyncWrapper(ItemDoacaoController.buscarPorId));

router
    .post("/itemdoacao", AuthMiddleware, asyncWrapper(ItemDoacaoController.criar))
    .put("/itemdoacao/:id", AuthMiddleware, asyncWrapper(ItemDoacaoController.atualizar))
    .delete("/itemdoacao/:id", AuthMiddleware, asyncWrapper(ItemDoacaoController.excluir)); // A barra '/' foi corrigida aqui

export default router;


