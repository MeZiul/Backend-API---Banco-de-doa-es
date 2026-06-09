import express from "express";
import NotificacaoController from "../controllers/NotificacaoController.js";
import AuthMiddleware from "../middlewares/AuthMiddleware.js";
import asyncWrapper from "../middlewares/asyncWrapper.js";
import { validate } from "../middlewares/validateMiddleware.js";
import { notificacaoQuerySchema } from "../utils/validators/schemas/zod/querys/NotificacaoQuerySchema.js"

const router = express.Router();

router.use(AuthMiddleware);

router.get("/notificacoes",
    validate(notificacaoQuerySchema, 'query'),
    asyncWrapper(NotificacaoController.listar)
);

//Retorna quantidade não lida
router.get("/notificacoes/contador",
    asyncWrapper(NotificacaoController.contarNaoLidas)
);

//Marca uma específica como lida
router.patch(
    "/notificacoes/:id/ler",
    asyncWrapper(NotificacaoController.marcarComoLida)

);

//Marca todas como lidas
router.post(
    "/notificacoes/ler-tudo",
    asyncWrapper(NotificacaoController.marcarTodasComoLidas)
);

export default router;
