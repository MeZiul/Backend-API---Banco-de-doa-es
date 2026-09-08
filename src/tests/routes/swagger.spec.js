import express from "express";
import helmet from "helmet";
import request from "supertest";
import { beforeAll, describe, expect, test } from "@jest/globals";
import routes from "../../routes/index.js";

let app;

beforeAll(() => {
  app = express();
  app.use(helmet());
  routes(app);
});

describe("Swagger UI", () => {
  test("serve a interface com scripts locais compatíveis com a CSP", async () => {
    const response = await request(app).get("/docs/");
    const scriptTags = [...response.text.matchAll(/<script\b([^>]*)>/g)];

    expect(response.statusCode).toBe(200);
    expect(response.headers["content-security-policy"]).toContain("script-src 'self'");
    expect(response.text).not.toContain("unpkg.com");
    expect(response.text).toContain("./swagger-ui-bundle.js");
    expect(response.text).toContain("./swagger-ui-init.js");
    expect(response.text).toContain("/docs/download-json.js");
    expect(scriptTags.length).toBeGreaterThan(0);
    expect(scriptTags.every(([, attributes]) => /\bsrc=/.test(attributes))).toBe(true);
  });

  test.each([
    ["/docs/swagger-ui.css", /text\/css/],
    ["/docs/swagger-ui-bundle.js", /javascript/],
    ["/docs/swagger-ui-standalone-preset.js", /javascript/],
    ["/docs/swagger-ui-init.js", /javascript/],
    ["/docs/download-json.js", /javascript/],
  ])("serve o asset local %s", async (path, contentType) => {
    const response = await request(app).get(path);

    expect(response.statusCode).toBe(200);
    expect(response.headers["content-type"]).toMatch(contentType);
  });

  test("mantém o contrato OpenAPI disponível para download", async () => {
    const response = await request(app).get("/docs.json");

    expect(response.statusCode).toBe(200);
    expect(response.headers["content-disposition"]).toContain("doai-api-docs.json");
    expect(response.body.openapi).toBe("3.0.0");
    expect(response.body.paths).toHaveProperty("/interesses");
    expect(response.body.paths).toHaveProperty("/denuncias");
    expect(response.body.paths).toHaveProperty("/admin/usuarios");
  });
});
