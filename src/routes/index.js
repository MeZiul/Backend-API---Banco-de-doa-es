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
/*
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
import usuario from './usuarioRoutes.js'
import auth from './authRoutes.js';

dotenv.config();

const routes = (app) => {
    if (process.env.DEBUGLOG) {
        app.use(logRoutes);
    }
    // rota para encaminhar da raiz para /docs
    app.get("/", (req, res) => {
         res.json({ message: "DoaI API", version: "1.0.0", status: "online" });
    });
    
    // ── Registro das rotas da API ──────────────────────
    app.use(express.json());
    app.use(auth); 

    app.use(example);
    
    app.use (usuario);
};

export default routes;