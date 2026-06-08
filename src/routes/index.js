// src/routes/index.js

// BIBLIOTECAS
import express from "express";
import swaggerJsDoc from "swagger-jsdoc";
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
import example from './exampleRoutes.js';
import usuario from './usuarioRoutes.js';
import categoria from './categoriaRoutes.js';
import avaliacao from './avaliacaoRotas.js';
import auth from './authRoutes.js';
import itemDoacao from './itemDoacaoRoutes.js';
import interesse from './interesseRoutes.js';
import denuncia from './denunciaRoutes.js';
import administracao from './administracaoRoutes.js';
import notificacao from './notificacaoRoutes.js';
import perfil from './perfilRoutes.js';

dotenv.config();

const buildSwaggerDocsForRequest = (swaggerDocs, req) => {
  const seenUrls = new Set();
  const servers = [
    { url: "/", description: "Mesmo host da documentação" },
    ...(swaggerDocs.servers || []),
  ].filter(({ url }) => {
    if (!url || seenUrls.has(url)) return false;
    seenUrls.add(url);
    return true;
  });

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

  app.get("/docs.json", (req, res) => {
    const docs = buildSwaggerDocsForRequest(swaggerDocs, req);

    res.setHeader("Content-Type", "application/json");
    res.setHeader(
      "Content-Disposition",
      'attachment; filename="doai-api-docs.json"',
    );
    res.json(docs);
  });

  app.get("/docs", (req, res) => {
    const docs = buildSwaggerDocsForRequest(swaggerDocs, req);
    const html = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>API Banco de Doações DoaÍ - Documentação</title>
    <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5.11.0/swagger-ui.css" />
    <style>
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
            box-shadow: 0 2px 4px rgba(0,0,0,0.2);
            transition: background-color 0.2s;
        }
        .download-json-btn:hover {
            background-color: #3db47e;
        }
    </style>
</head>
<body>
    <a href="/docs.json" class="download-json-btn" download>Download JSON</a>
    <div id="swagger-ui"></div>
    <script src="https://unpkg.com/swagger-ui-dist@5.11.0/swagger-ui-bundle.js"></script>
    <script src="https://unpkg.com/swagger-ui-dist@5.11.0/swagger-ui-standalone-preset.js"></script>
    <script>
        window.onload = function() {
            SwaggerUIBundle({
                spec: ${JSON.stringify(docs)},
                dom_id: '#swagger-ui',
                deepLinking: true,
                presets: [
                    SwaggerUIBundle.presets.apis,
                    SwaggerUIStandalonePreset
                ],
                plugins: [
                    SwaggerUIBundle.plugins.DownloadUrl
                ],
                layout: "StandaloneLayout",
                persistAuthorization: true
            });
        };
    </script>
</body>
</html>`;
        res.setHeader('Content-Type', 'text/html');
        res.send(html);
    });

    // ── Registro das rotas da API ──────────────────────
    app.use(express.json());
    app.use(auth);

    app.use(example);

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
