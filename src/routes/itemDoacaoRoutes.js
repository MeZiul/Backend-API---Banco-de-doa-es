import express from "express";
import ItemDoacaoController from "../controllers/ItemDoacaoController.js";
import ImagemItemController from "../controllers/ImagemItemController.js"; // Novo Import
import AuthMiddleware from "../middlewares/AuthMiddleware.js";
import { uploadFotos } from "../middlewares/uploadMiddleware.js"; // Middleware do Multer
import asyncWrapper from "../middlewares/asyncWrapper.js";
import { validate } from "../middlewares/validateMiddleware.js";
import { itemDoacaoSchema } from "../utils/validators/schemas/zod/ItemDoacaoSchema.js";
import { itemDoacaoQuerySchema } from "../utils/validators/schemas/zod/ItemDoacaoQuerySchema.js";

const router = express.Router();

/**
 * Rotas Públicas (RF-003 / RF-011)
 */
router.get(
    "/itemdoacao",
    validate(itemDoacaoQuerySchema, 'query'),
    asyncWrapper(ItemDoacaoController.listar)
);

router.get(
    "/itemdoacao/:id",
    asyncWrapper(ItemDoacaoController.buscarPorId)
);

/**
 * Rotas Privadas (Exigem Autenticação)
 */
router.post(
    "/itemdoacao",
    AuthMiddleware,
    validate(itemDoacaoSchema, 'body'),
    asyncWrapper(ItemDoacaoController.criar)
);

router.put(
    "/itemdoacao/:id",
    AuthMiddleware,
    validate(itemDoacaoSchema, 'body'),
    asyncWrapper(ItemDoacaoController.atualizar)
);

router.delete(
    "/itemdoacao/:id",
    AuthMiddleware,
    asyncWrapper(ItemDoacaoController.excluir)
);

/**
 * ROTA DE UPLOAD DE IMAGENS (RF-012)
 * Aqui usamos o Multer para processar o array de fotos antes do Controller.
 */
router.post(
    "/itemdoacao/:id/fotos",
    AuthMiddleware,
    uploadFotos.array("fotos", 5), // 'fotos' é o nome do campo no FormData
    asyncWrapper(ImagemItemController.upload)
);

export default router;