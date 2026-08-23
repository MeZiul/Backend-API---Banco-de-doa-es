// app
import dotenv from "dotenv";
dotenv.config();

import express from "express";
import compression from "compression";
import helmet from "helmet";
import cors from "cors";
import rateLimit from "express-rate-limit";

import routes from "./routes/index.js";
import DbConnect from "./config/DbConnect.js";
import errorHandler from "./utils/helpers/errorHandler.js";
import logger from "./utils/logger.js";
import CommonResponse from "./utils/helpers/CommonResponse.js";

const app = express();

DbConnect.conectar()
    .then(() =>
        logger.info("Conexão com o banco de dados estabelecida com sucesso.")
    )
    .catch((error) => {
        logger.error("Erro ao conectar com o banco de dados:", error);
        process.exit(1);
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

/* ───────────── SEO ───────────── */

app.use((req, res, next) => {
    res.setHeader(
        "X-Robots-Tag",
        "noindex, nofollow, noarchive, nosnippet"
    );
    next();
});

app.get("/robots.txt", (req, res) => {
    res.type("text/plain");
    res.send("User-agent: *\nDisallow: /\n");
});

/* ───────────── Middlewares ───────────── */

app.use(compression());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/* ───────────── Arquivos públicos ───────────── */

app.use("/uploads", express.static("uploads"));

/* ───────────── Rotas ───────────── */

routes(app);

/* ───────────── 404 ───────────── */

app.use((req, res) => {
    return CommonResponse.error(
        res,
        404,
        "resourceNotFound",
        null,
        [{ message: "Rota não encontrada." }]
    );
});

/* ───────────── Tratamento de erros ───────────── */

app.use(errorHandler);

process.on("unhandledRejection", (reason, promise) => {
    logger.error(
        "Unhandled Rejection at:",
        promise,
        "reason:",
        reason
    );
});

process.on("uncaughtException", (error) => {
    logger.error("Uncaught Exception thrown:", error);
});

export default app;