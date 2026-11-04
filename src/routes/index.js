// src/routes/index.js

// BIBLIOTECAS
import express from "express";
import swaggerJsDoc from "swagger-jsdoc";
import { registerApiReference } from "../docs/scalar.js";
import getOpenApiOptions from "../docs/config/head.js";
import dotenv from "dotenv";

// MIDDLEWARES
import logRoutes from "../middlewares/LogRoutesMiddleware.js";

// ── Rotas de domínio ────────────────────────────────────
import usuario from "./usuarioRoutes.js";
import categoria from "./categoriaRoutes.js";
import avaliacao from "./avaliacaoRoutes.js";
import auth from "./authRoutes.js";
import itemDoacao from "./itemDoacaoRoutes.js";
import interesse from "./interesseRoutes.js";
import denuncia from "./denunciaRoutes.js";
import administracao from "./administracaoRoutes.js";
import notificacao from "./notificacaoRoutes.js";
import perfil from "./perfilRoutes.js";

dotenv.config();

const routes = (app) => {
  if (process.env.DEBUGLOG === "true") {
    app.use(logRoutes);
  }
  // rota para encaminhar da raiz para /docs
  app.get("/", (req, res) => {
    res.redirect("/docs");
  });

  const openApi = swaggerJsDoc(getOpenApiOptions());
  registerApiReference(app, openApi);

  // ── Registro das rotas da API ──────────────────────
  app.use(auth);

  app.use(usuario);

  app.use(categoria);

  app.use(avaliacao);

  app.use(itemDoacao);
  app.use(interesse);
  app.use(denuncia);
  app.use(administracao);
  app.use(notificacao);
  app.use(perfil);
};

export default routes;
