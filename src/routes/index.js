// src/routes/index.js

// BIBLIOTECAS
import express from "express";
/* import swaggerJsDoc from "swagger-jsdoc"; */
/* import getSwaggerOptions from "../docs/config/head.js"; */
import dotenv from "dotenv";
import mongoose from "mongoose";

// MIDDLEWARES
import logRoutes from "../middlewares/LogRoutesMiddleware.js";

// ── Rotas de domínio ────────────────────────────────────
/* import auth from './authRoutes.js';
import usuarios from './usuarioRoutes.js';
import instituicoes from './instituicaoRoutes.js';
import filas from './filaRoutes.js';
import senhas from './senhaRoutes.js';
import qrCodes from './qrCodeRoutes.js';
import auditorias from './auditoriaRoutes.js';
import perfil from './perfilRoutes.js';
import landingPage from './landingPageRoutes.js';
import dashboard from './dashboardRoutes.js'; */
import example from './exampleRoutes.js';

dotenv.config();

const routes = (app) => {
    if (process.env.DEBUGLOG) {
        app.use(logRoutes);
    }
    // rota para encaminhar da raiz para /docs
    app.get("/", (req, res) => {
        res.redirect("/");
    });
    
    // ── Registro das rotas da API ──────────────────────
    app.use(express.json());
    /* app.use('/auth', auth); */

    app.use(example);
};

export default routes;