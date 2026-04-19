import express from "express"
import ItemDoacaoController from "../controllers/ItemDoacaoController.js"
import AuthMiddleware from "../middlewares/AuthMiddleware.js";
import { asyncWrapper } from "../utils/helpers/index.js";

const router = express.Router();

router
    .get("/itemdoacao", AuthMiddleware,asyncWrapper(ItemDoacaoController),)
    .get("/itemdoacao/:id", AuthMiddleware, asyncWrapper(ItemDoacaoController),)
    .post("/itemdoacao", AuthMiddleware, asyncWrapper(ItemDoacaoController),)
    .put("/itemdoacao/:id", AuthMiddleware, asyncWrapper(ItemDoacaoController),)
    .delete("itemdoacao/:id", AuthMiddleware, asyncWrapper(ItemDoacaoController),)

export default router;
