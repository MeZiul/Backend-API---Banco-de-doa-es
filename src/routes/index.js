// src/routes/index.js

// BIBLIOTECAS
import express from "express";
import swaggerJsDoc from "swagger-jsdoc";
import swaggerUi from "swagger-ui-express";
import getSwaggerOptions from "../docs/config/head.js";
import dotenv from "dotenv";

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
import landingPage from './landingPageRoutes.js';
import dashboard from './dashboardRoutes.js'; */
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

const buildSwaggerDocsForRequest = (swaggerDocs, req) => {
  const seenUrls = new Set();
  const servers = [...(swaggerDocs.servers || [])].filter(
    ({ url }) => {
      if (!url || seenUrls.has(url)) return false;
      seenUrls.add(url);
      return true;
    },
  );

  return {
    ...swaggerDocs,
    servers,
  };
};

const routes = (app) => {
  if (process.env.DEBUGLOG) {
    app.use(logRoutes);
  }
  // rota para encaminhar da raiz para /docs
  app.get("/", (req, res) => {
    res.redirect("/docs");
  });

  const swaggerDocs = swaggerJsDoc(getSwaggerOptions());
  const swaggerUiOptions = {
    customSiteTitle: "API Banco de Doações DoaÍ - Documentação",
    customRobots: "noindex, nofollow, noarchive, nosnippet",
    customJs: "/docs/download-json.js",
    customCss: `
      .download-json-btn {
        position: fixed;
        top: 10px;
        right: 20px;
        z-index: 9999;
        background-color: #49cc90;
        color: white;
        padding: 8px 16px;
        border-radius: 4px;
        text-decoration: none;
        font-family: sans-serif;
        font-size: 14px;
        font-weight: bold;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
      }
      .download-json-btn:hover { background-color: #3db47e; }
    `,
    swaggerOptions: {
      deepLinking: true,
      persistAuthorization: true,
    },
  };

  app.get("/docs.json", (req, res) => {
    const docs = buildSwaggerDocsForRequest(swaggerDocs, req);

    res.setHeader("Content-Type", "application/json");
    res.setHeader(
      "Content-Disposition",
      'attachment; filename="doai-api-docs.json"',
    );
    res.json(docs);
  });

  app.get("/docs/download-json.js", (_req, res) => {
    res.type("application/javascript").send(`
      (() => {
        const addDownloadButton = () => {
          if (document.querySelector(".download-json-btn")) return;

          const link = document.createElement("a");
          link.href = "/docs.json";
          link.className = "download-json-btn";
          link.download = "doai-api-docs.json";
          link.textContent = "Download JSON";
          document.body.appendChild(link);
        };

        if (document.readyState === "loading") {
          document.addEventListener("DOMContentLoaded", addDownloadButton);
        } else {
          addDownloadButton();
        }
      })();
    `);
  });

  // Assets e inicialização locais mantêm o Swagger compatível com a CSP do Helmet.
  app.use("/docs", swaggerUi.serveFiles(swaggerDocs, swaggerUiOptions));
  app.get("/docs", swaggerUi.setup(swaggerDocs, swaggerUiOptions));

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
