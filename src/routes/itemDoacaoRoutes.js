import express from "express";
import ItemDoacaoController from "../controllers/ItemDoacaoController.js";
import ImagemItemController from "../controllers/ImagemItemController.js"; // Novo Import
import AuthMiddleware from "../middlewares/AuthMiddleware.js";
import EnsureActiveUserMiddleware from "../middlewares/EnsureActiveUserMiddleware.js";
import { uploadFotos } from "../middlewares/uploadMiddleware.js"; // Middleware do Multer
import asyncWrapper from "../middlewares/asyncWrapper.js";
import { validate } from "../middlewares/validateMiddleware.js";
import { itemDoacaoSchema } from "../utils/validators/schemas/zod/ItemDoacaoSchema.js";
import { itemDoacaoQuerySchema } from "../utils/validators/schemas/zod/querys/ItemDoacaoQuerySchema.js";

const router = express.Router();

router
    .get("/itemdoacao", validate(itemDoacaoQuerySchema, 'query'),
        asyncWrapper(ItemDoacaoController.listar))

    .get("/itemdoacao/:id", asyncWrapper(ItemDoacaoController.buscarPorId))

    .post("/itemdoacao", AuthMiddleware, validate(itemDoacaoSchema, 'body'),
        asyncWrapper(ItemDoacaoController.criar))

    .put("/itemdoacao/:id/confirmar-entrega",     AuthMiddleware,
        asyncWrapper(ItemDoacaoController.confirmarEntrega))
    .put("/itemdoacao/:id/confirmar-recebimento", AuthMiddleware,
        asyncWrapper(ItemDoacaoController.confirmarRecebimento))

    .put("/itemdoacao/:id", AuthMiddleware, validate(itemDoacaoSchema.partial(), 'body'),
        asyncWrapper(ItemDoacaoController.atualizar))

    .delete("/itemdoacao/:id", AuthMiddleware, asyncWrapper(ItemDoacaoController.deletar))

    .post("/itemdoacao/:id/fotos", AuthMiddleware, uploadFotos.array("fotos", 5),
        asyncWrapper(ImagemItemController.upload))

    .delete("/itemdoacao/:id/fotos/:fotoId", AuthMiddleware, asyncWrapper(ImagemItemController.deletar))

    .patch("/itens/:id/cancelar", AuthMiddleware, asyncWrapper(ItemDoacaoController.cancelarItem))

    .get("/itens/:id/interesses", AuthMiddleware, EnsureActiveUserMiddleware,
        asyncWrapper(ItemDoacaoController.listarInteresses));

export default router;
