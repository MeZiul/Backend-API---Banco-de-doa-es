// src/app.js
import dotenv from 'dotenv';
dotenv.config()

import express from 'express';
import routes from './routes/index.js';
import compression from 'compression';
import helmet from "helmet";
import cors from "cors";
import rateLimit from "express-rate-limit";
import { toNodeHandler } from "better-auth/node";

import DbConnect from './config/DbConnect.js';
import { auth } from "./config/betterAuth.js";
import errorHandler from './utils/helpers/errorHandler.js';
import logger from './utils/logger.js';
import CommonResponse from './utils/helpers/CommonResponse.js';
import { configureTrustProxy } from './config/trustProxy.js';
//import fileUpload from 'express-fileupload';
//import path, { dirname } from 'path';
//import { fileURLToPath } from 'url';

const app = express();

// Deve ser configurado antes dos rate limiters para que req.ip represente o cliente.
configureTrustProxy(app);

// Conexão com o banco de dados.
DbConnect.conectar()
    .then(() => logger.info('Conexão com o banco de dados estabelecida com sucesso.'))
    .catch((error) => {
        logger.error('Erro ao conectar com o banco de dados:', error);
        process.exit(1); // Encerra o processo se a conexão falhar.
    });

/* ───────────── Segurança ───────────── */
app.use(helmet());

app.use(
    cors({
        origin: process.env.FRONTEND_URL,
        methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
        allowedHeaders: ["Content-Type", "Authorization"],
        credentials: true
    })
);

// Rate limit geral da API
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 300,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    message: {
        message: "Muitas requisições. Tente novamente mais tarde."
    }
});

app.use(apiLimiter);

/* ───────────── 2.1 Bloqueio de indexação (SEO) ───────────── */
// Impede que buscadores indexem a API
app.use((req, res, next) => {
    res.setHeader('X-Robots-Tag', 'noindex, nofollow, noarchive, nosnippet');
    next();
});

// Serve robots.txt na raiz da API
app.get('/robots.txt', (req, res) => {
    res.type('text/plain');
    res.send('User-agent: *\nDisallow: /\n');
});

app.use(compression());

// O handler do Better Auth deve receber o corpo bruto antes do parser JSON do Express.
app.all("/api/auth/*splat", toNodeHandler(auth));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));


// Deixa a pasta 'uploads' pública para a internet conseguir ver as imagens
app.use('/uploads', express.static('uploads'));


/* ───────────── 4. Rotas ───────────── */
routes(app);


/* ───────────── 5. 404 – rota não encontrada ───────────── */
app.use((req, res) => {
    return CommonResponse.error(
        res,
        404,
        'resourceNotFound',
        null,
        [{ message: 'Rota não encontrada.' }]
    );
});


app.use(errorHandler);

/* ───────────── 6. Eventos globais de erro não tratado ───────────── */
process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
    logger.error('Uncaught Exception thrown:', error);
});

/* ───────────── 7. Middleware central de erros ───────────── */
export default app;
