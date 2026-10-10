import { randomBytes } from "node:crypto";
import { createRequire } from "node:module";
import path from "node:path";
import helmet from "helmet";

const packageRequire = createRequire(import.meta.url);
// The installed UMD bundle is self-contained; no CDN, lazy chunks or proxy.
const bundlePath = path.join(path.dirname(packageRequire.resolve("@scalar/api-reference")), "browser", "standalone.js");

export function registerApiReference(app, openApi) {
  app.get("/docs.json", (_req, res) => {
    res.type("application/json").attachment("doai-api-docs.json").json(openApi);
  });

  // Fixed package file only; support checkouts below a .worktrees directory.
  app.get("/docs/assets/scalar.js", (_req, res) => res.sendFile(bundlePath, { dotfiles: "allow" }));

  const connectOrigins = [...new Set((openApi.servers || []).flatMap(({ url }) => {
    if (!/^https?:\/\//i.test(url)) return [];
    return [new URL(url).origin];
  }))];
  const serversJson = JSON.stringify(openApi.servers || []).replace(/</g, "\\u003c");

  app.get("/docs", (req, res, next) => {
    const nonce = randomBytes(24).toString("base64");
    // Scoped to this HTML response. API/assets/404 keep the global Helmet CSP.
    helmet.contentSecurityPolicy({ directives: {
      ...helmet.contentSecurityPolicy.getDefaultDirectives(),
      "script-src": ["'self'", `'nonce-${nonce}'`],
      "style-src": ["'self'", "'unsafe-inline'"],
      "connect-src": ["'self'", ...connectOrigins],
      "font-src": ["'self'"],
      "img-src": ["'self'", "data:", "blob:"],
      "upgrade-insecure-requests": process.env.NODE_ENV === "production" ? [] : null,
    } })(req, res, (error) => {
      if (error) return next(error);
      res.set("Cache-Control", "no-store").type("html").send(`<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="robots" content="noindex, nofollow, noarchive, nosnippet">
  <meta property="csp-nonce" content="${nonce}">
  <link rel="icon" href="data:,">
  <title>DoaÍ · Referência da API</title>
  <style nonce="${nonce}">:root,.scalar-app{--scalar-font:system-ui,sans-serif!important;--scalar-font-code:ui-monospace,monospace!important}body{margin:0}nav{padding:12px 20px;font:14px system-ui;display:flex;gap:20px}nav a:focus-visible{outline:2px solid currentColor;outline-offset:4px}</style>
</head>
<body>
  <nav aria-label="Downloads da documentação"><a href="/docs.json" download="doai-api-docs.json">Baixar OpenAPI</a><a href="/docs/postman">Coleções Postman</a></nav>
  <!-- The standalone bundle auto-mounts #api-reference with defaults; use our own target. -->
  <div id="doai-reference"></div>
  <script nonce="${nonce}" src="/docs/assets/scalar.js"></script>
  <script nonce="${nonce}">Scalar.createApiReference('#doai-reference', {
    url: '/docs.json', withDefaultFonts: false, persistAuth: false,
    servers: ${serversJson}.map(server => server.url === '/' ? { ...server, url: window.location.origin } : server),
    telemetry: false, agent: { disabled: true }, hideClientButton: true, showDeveloperTools: 'never'
  });</script>
</body>
</html>`);
    });
  });
}
