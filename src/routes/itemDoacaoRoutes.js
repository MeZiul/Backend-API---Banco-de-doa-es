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
import { cancelarItemSchema } from "../utils/validators/schemas/zod/CancelarItemSchema.js";
import EnsureCompleteRegistrationMiddleware from "../middlewares/EnsureCompleteRegistrationMiddleware.js";

const router = express.Router();
const activeUserOnly = [AuthMiddleware, EnsureCompleteRegistrationMiddleware];
router
    .get("/itemdoacao", validate(itemDoacaoQuerySchema, 'query'),
        asyncWrapper(ItemDoacaoController.listar))

    .get("/itemdoacao/:id", asyncWrapper(ItemDoacaoController.buscarPorId))

    .post("/itemdoacao", ...activeUserOnly, validate(itemDoacaoSchema, 'body'),
        asyncWrapper(ItemDoacaoController.criar))

    .put("/itemdoacao/:id/confirmar-entrega", ...activeUserOnly,
        asyncWrapper(ItemDoacaoController.confirmarEntrega))

    .put("/itemdoacao/:id/confirmar-recebimento", ...activeUserOnly,
        asyncWrapper(ItemDoacaoController.confirmarRecebimento))

    .put("/itemdoacao/:id", ...activeUserOnly, validate(itemDoacaoSchema.partial(), 'body'),
        asyncWrapper(ItemDoacaoController.atualizar))

    .delete("/itemdoacao/:id", ...activeUserOnly, asyncWrapper(ItemDoacaoController.deletar))

    .post("/itemdoacao/:id/fotos", ...activeUserOnly, uploadFotos.array("fotos", 5),
        asyncWrapper(ImagemItemController.upload))

    .delete("/itemdoacao/:id/fotos/:fotoId", ...activeUserOnly, asyncWrapper(ImagemItemController.deletar))

    .patch("/itens/:id/cancelar", ...activeUserOnly, validate(cancelarItemSchema, "body"),
        asyncWrapper(ItemDoacaoController.cancelarItem))

    .get("/itens/:id/interesses", ...activeUserOnly, EnsureActiveUserMiddleware,
        asyncWrapper(ItemDoacaoController.listarInteresses));

export default router;
