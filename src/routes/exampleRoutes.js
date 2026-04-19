// src/routes/ExampleRoutes.js
import express from 'express';
import { asyncWrapper } from '../utils/helpers/index.js';
import ExampleController from '../controllers/ExampleController.js';


const router = express.Router();

router
    // ── Rota global: Listagem de todos os examples ──
    .get(
        '/examples',
        asyncWrapper(ExampleController.listar),
    )

export default router;
