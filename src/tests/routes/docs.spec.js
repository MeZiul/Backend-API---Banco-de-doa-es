import request from "supertest";
import { beforeAll, describe, expect, jest, test } from "@jest/globals";

jest.mock("../../config/DbConnect.js", () => ({
  __esModule: true, default: { conectar: jest.fn().mockResolvedValue(undefined) },
}));
jest.mock("../../config/betterAuth.js", () => ({ auth: { api: {} } }));

let app;
beforeAll(async () => { ({ default: app } = await import("../../app.js")); });

const walkRoutes = (stack) => stack.flatMap((layer) => {
  if (layer.route) return Object.keys(layer.route.methods).map((method) => `${method} ${layer.route.path.replace(/:([^/]+)/g, "{$1}")}`);
  return layer.handle?.stack ? walkRoutes(layer.handle.stack) : [];
});
const domainOperation = (value) => !/^(?:get \/(?:$|docs(?:\/|$|\.json$)|robots\.txt$)|\S+ \/api\/auth\/)/.test(value);

describe("Scalar local e contrato OpenAPI", () => {
  test("HTML usa nonce distinto por resposta, sem scripts remotos e com downloads acessíveis", async () => {
    const [a, b] = await Promise.all([request(app).get("/docs"), request(app).get("/docs")]);
    expect(a.status).toBe(200);
    expect(a.headers["cache-control"]).toBe("no-store");
    const nonce = a.text.match(/property="csp-nonce" content="([^"]+)"/)[1];
    expect(a.headers["content-security-policy"]).toContain(`script-src 'self' 'nonce-${nonce}'`);
    expect(a.headers["content-security-policy"]).not.toContain("'unsafe-eval'");
    expect(a.headers["content-security-policy"].split(";").find(x => x.includes("script-src"))).not.toContain("'unsafe-inline'");
    expect(a.text.match(/<script/g)).toHaveLength(2);
    const nonceAttributes = [...a.text.matchAll(/\bnonce="([^"]+)"/g)].map(match => match[1]);
    expect(nonceAttributes).toEqual([nonce, nonce, nonce]);
    expect(a.text).toContain('href="/docs.json"');
    expect(a.text).toContain('href="/docs/postman"');
    expect(a.text).toContain('src="/docs/assets/scalar.js"');
    expect(a.text).not.toMatch(/https?:\/\//);
    expect(a.text).toContain("telemetry: false");
    expect(a.text).toContain("persistAuth: false");
    expect(a.text).toContain('id="doai-reference"');
    expect(a.text).not.toContain('id="api-reference"');
    expect(a.text).toContain("agent: { disabled: true }");
    expect(a.text).toContain("url: window.location.origin");
    expect(b.text).not.toContain(nonce);
  });

  test("o bundle instalado é entregue localmente", async () => {
    const res = await request(app).get("/docs/assets/scalar.js");
    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toMatch(/javascript/);
    expect(res.text).toContain("createApiReference");
    expect(res.headers["x-content-type-options"]).toBe("nosniff");
    expect(res.headers["content-security-policy"]).not.toContain("nonce-");
  });

  test.each(["/docs/download-json.js", "/docs/swagger-ui-init.js", "/docs/ausente.js", "/nao-existe"])("%s mantém 404/CSP global", async (url) => {
    const res = await request(app).get(url);
    expect(res.status).toBe(404);
    expect(res.headers["content-security-policy"]).toContain("script-src 'self'");
    expect(res.headers["content-security-policy"]).not.toContain("nonce-");
    expect(res.headers["cross-origin-resource-policy"]).toBe("same-origin");
  });

  test("download preserva JSON, references válidas e cobre exatamente as operações de domínio registradas", async () => {
    const res = await request(app).get("/docs.json");
    expect(res.status).toBe(200);
    expect(res.headers["content-disposition"]).toContain('filename="doai-api-docs.json"');
    expect(res.headers["content-security-policy"]).not.toContain("nonce-");
    const spec = res.body;
    expect(spec.openapi).toBe("3.0.0");
    expect(Object.keys(spec.paths)).toHaveLength(56);
    const documented = Object.entries(spec.paths).flatMap(([path, methods]) => Object.keys(methods).map(method => `${method} ${path}`));
    expect(documented).toHaveLength(77);
    const registered = walkRoutes(app.router.stack).filter(domainOperation);
    expect(documented.filter(domainOperation).sort()).toEqual([...new Set(registered)].sort());
    expect(documented.filter(operation => operation.includes(" /api/auth/")).sort()).toEqual([
      "get /api/auth/get-session",
      "post /api/auth/request-password-reset",
      "post /api/auth/reset-password",
      "post /api/auth/sign-in/email",
      "post /api/auth/sign-out",
      "post /api/auth/sign-up/email",
    ]);
    const refs = [...JSON.stringify(spec).matchAll(/"\$ref":"#\/components\/schemas\/([^"]+)"/g)].map(match => match[1]);
    for (const name of refs) expect(spec.components.schemas[name]).toBeDefined();
    for (const [path, methods] of Object.entries(spec.paths)) for (const operation of Object.values(methods)) {
      for (const parameter of [...path.matchAll(/\{([^}]+)\}/g)].map(match => match[1])) {
        expect(operation.parameters?.some(p => p.in === "path" && p.name === parameter && p.required)).toBe(true);
      }
    }
    expect(JSON.stringify(spec)).not.toContain("Admin@123");
  });

  test("rotas públicas e schemas de escrita não publicam privilégio/contadores editáveis", async () => {
    const { body: spec } = await request(app).get("/docs.json");
    for (const [path, method] of [["/usuario", "post"], ["/auth/login", "post"], ["/auth/esqueci-senha", "post"], ["/auth/redefinir-senha", "put"], ["/categorias", "get"], ["/categorias/{id}", "get"], ["/itemdoacao", "get"], ["/itemdoacao/{id}", "get"]]) expect(spec.paths[path][method].security).toEqual([]);
    expect(spec.components.securitySchemes.bearerAuth.bearerFormat).toBe("BetterAuthSession");
    expect(spec.components.schemas.UsuarioPost.additionalProperties).toBe(false);
    expect(spec.components.schemas.UsuarioPost.properties).not.toHaveProperty("perfil");
    expect(spec.components.schemas.UsuarioPutPatch.properties).not.toHaveProperty("total_doacoes");
    expect(spec.components.schemas.AvaliacaoPutPatch.additionalProperties).toBe(false);
    expect(spec.components.schemas.AvaliacaoPutPatch.properties).not.toHaveProperty("avaliado_id");
    expect(spec.components.schemas.UsuarioCompleto.readOnly).toBe(true);
    expect(spec.components.schemas.ItemDoacaoPost.properties).not.toHaveProperty("status");
  });

  test("documenta contratos nativos Better Auth e valida exemplos OpenAPI", async () => {
    const { body: spec } = await request(app).get("/docs.json");
    const signup = spec.paths["/api/auth/sign-up/email"].post;
    const signin = spec.paths["/api/auth/sign-in/email"].post;
    const getSession = spec.paths["/api/auth/get-session"].get;
    const signout = spec.paths["/api/auth/sign-out"].post;
    const requestReset = spec.paths["/api/auth/request-password-reset"].post;
    const resetPassword = spec.paths["/api/auth/reset-password"].post;
    const signupExample = signup.requestBody.content["application/json"].example;
    const resetExample = resetPassword.requestBody.content["application/json"].example;

    for (const operation of [signup, signin, signout, requestReset, resetPassword]) {
      expect(operation.parameters).toContainEqual(expect.objectContaining({
        name: "Origin",
        in: "header",
        required: true,
      }));
    }
    expect(signup.security).toEqual([]);
    expect(signin.security).toEqual([]);
    expect(getSession.security).toEqual([{ bearerAuth: [] }, {}]);
    expect(signout.security).toEqual([{ bearerAuth: [] }]);
    expect(signin.responses[200].headers).toHaveProperty("Set-Cookie");
    expect(signin.responses[200].headers).toHaveProperty("set-auth-token");
    expect(getSession.responses[200].content["application/json"].schema.$ref).toBe("#/components/schemas/NativeAuthGetSessionResponse");
    expect(signout.responses[200].headers).toHaveProperty("Set-Cookie");
    expect(resetPassword.parameters).toContainEqual(expect.objectContaining({ name: "token", in: "query", required: false }));
    expect(spec.components.schemas.NativeAuthResetPasswordRequest.required).toEqual(["newPassword"]);
    expect(signup.responses[200].content["application/json"].schema.$ref).toBe("#/components/schemas/NativeAuthSignUpEmailResponse");
    expect(spec.components.schemas.NativeAuthSignUpEmailRequest.additionalProperties).toBe(false);
    expect(spec.components.schemas.NativeAuthGetSessionResponse.nullable).toBe(true);
    expect(spec.components.schemas.NativeAuthErrorResponse.required).toEqual(["code", "message"]);
    for (const operation of [signup, signin, signout, requestReset, resetPassword]) {
      expect(operation.responses[403].content["application/json"].schema.$ref).toBe("#/components/schemas/NativeAuthErrorResponse");
    }
    for (const operation of [signup, signin, requestReset, resetPassword]) {
      expect(operation.responses[429].content["application/json"].schema.$ref).toBe("#/components/schemas/NativeAuthRateLimitResponse");
    }
    const signupPasswordPattern = new RegExp(spec.components.schemas.NativeAuthSignUpEmailRequest.properties.password.pattern);
    const resetPasswordPattern = new RegExp(spec.components.schemas.NativeAuthResetPasswordRequest.properties.newPassword.pattern);
    expect(signupPasswordPattern.test(signupExample.password)).toBe(true);
    expect(signupPasswordPattern.test("fraca123")).toBe(false);
    expect(resetPasswordPattern.test(resetExample.newPassword)).toBe(true);
    expect(resetPasswordPattern.test("fraca123")).toBe(false);
    expect(requestReset.requestBody.content["application/json"].example.email).toMatch(/@example\.invalid$/);
  });

  test("API protegida continua exigindo sessão", async () => {
    const res = await request(app).get("/notificacoes");
    expect(res.status).toBe(498);
    expect(res.headers["content-security-policy"]).not.toContain("nonce-");
  });
});
