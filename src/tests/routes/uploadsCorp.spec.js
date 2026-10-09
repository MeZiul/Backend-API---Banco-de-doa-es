import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, jest, test } from "@jest/globals";

let mockUploadsRoot;
jest.mock("../../config/uploads.js", () => ({
  get uploadsRoot() { return mockUploadsRoot; },
  get itemUploadsDir() { return require("node:path").join(mockUploadsRoot, "itens"); },
}));
jest.mock("../../config/DbConnect.js", () => ({
  __esModule: true, default: { conectar: jest.fn().mockResolvedValue(undefined) },
}));
jest.mock("../../config/betterAuth.js", () => ({ auth: { api: {} } }));

let app;
beforeAll(async () => {
  mockUploadsRoot = await fs.mkdtemp(path.join(process.cwd(), ".tmp-corp-"));
  await fs.mkdir(path.join(mockUploadsRoot, "itens"));
  const pixel = sharp({ create: { width: 1, height: 1, channels: 3, background: "white" } });
  await Promise.all([
    pixel.clone().png().toFile(path.join(mockUploadsRoot, "itens", "pixel.png")),
    pixel.clone().jpeg().toFile(path.join(mockUploadsRoot, "itens", "pixel.jpg")),
    pixel.clone().webp().toFile(path.join(mockUploadsRoot, "itens", "pixel.webp")),
    fs.writeFile(path.join(mockUploadsRoot, "outro.svg"), '<svg xmlns="http://www.w3.org/2000/svg"/>'),
  ]);
  ({ default: app } = await import("../../app.js"));
});

afterAll(async () => {
  if (mockUploadsRoot) await fs.rm(mockUploadsRoot, { recursive: true, force: true });
});

describe("CORP nas imagens públicas de uploads", () => {
  test.each([
    ["png", "image/png"], ["jpg", "image/jpeg"], ["webp", "image/webp"],
  ])("GET raster %s permite incorporação a partir do frontend", async (extension, mime) => {
    const res = await request(app).get(`/uploads/itens/pixel.${extension}`)
      .set("Origin", "http://localhost:5173");

    expect(res.statusCode).toBe(200);
    expect(res.headers["content-type"]).toContain(mime);
    expect(res.headers["cross-origin-resource-policy"]).toBe("cross-origin");
    expect(res.headers["x-content-type-options"]).toBe("nosniff");
    expect(res.headers["content-security-policy"]).toContain("script-src 'self'");
    expect(res.body.length).toBeGreaterThan(0);
  });

  test("imagem ausente retorna 404 com política global", async () => {
    const res = await request(app).get("/uploads/itens/ausente.png");
    expect(res.statusCode).toBe(404);
    expect(res.headers["cross-origin-resource-policy"]).toBe("same-origin");
  });

  test.each(["/robots.txt", "/docs.json", "/uploads/outro.svg", "/nao-existe"])(
    "%s mantém a política global do Helmet", async (url) => {
      const res = await request(app).get(url);
      expect(res.statusCode).toBe(url === "/nao-existe" ? 404 : 200);
      expect(res.headers["cross-origin-resource-policy"]).toBe("same-origin");
      expect(res.headers["x-content-type-options"]).toBe("nosniff");
    },
  );

  test("guarda de notificações continua exigindo sessão", async () => {
    const res = await request(app).get("/notificacoes");
    expect(res.statusCode).toBe(498);
    expect(res.headers["cross-origin-resource-policy"]).toBe("same-origin");
  });
});
