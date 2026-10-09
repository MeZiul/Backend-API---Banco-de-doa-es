import { beforeEach, afterEach, describe, expect, jest, test } from "@jest/globals";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import sharp from "sharp";
import express from "express";
import request from "supertest";
import { ImagemItemService } from "../../services/ImagemItemService.js";
import { canonicalItemImage } from "../../utils/itemImage.js";
import { uploadFotos } from "../../middlewares/uploadMiddleware.js";

let directory, service, repository, png;
const image = (buffer = png, mimetype = "image/png", originalname = "photo.html") => ({ buffer, mimetype, originalname });
beforeEach(async () => {
    directory = await fs.mkdtemp(path.join(os.tmpdir(), "doai-upload-test-"));
    png = await sharp({ create: { width: 3, height: 2, channels: 3, background: "red" } }).png().toBuffer();
    repository = {
        buscarPorId: jest.fn().mockResolvedValue({ usuario_id: "owner", status: "DISPONIVEL", fotos: [] }),
        adicionarFotos: jest.fn().mockImplementation(async (id, fotos) => ({ fotos })),
        atualizar: jest.fn().mockResolvedValue({ fotos: [] }),
    };
    service = new ImagemItemService(repository, path.join(directory, "itens"));
});
afterEach(async () => { await fs.rm(directory, { recursive: true, force: true }); });

describe("Item images: untrusted bytes and compensation", () => {
    test.each(["jpeg", "png", "webp"])("decodes and reencodes %s with canonical extension and MIME", async format => {
        const buffer = await sharp(png).toFormat(format).toBuffer();
        const output = await service.adicionarFotos("item", [image(buffer, `image/${format}`)], "owner");
        const foto = output.fotos[0];
        expect(foto.url).toMatch(new RegExp(`^/uploads/itens/[a-f0-9]{32}\\.${format === "jpeg" ? "jpg" : format}$`));
        const saved = await fs.readFile(path.join(service.directory, path.basename(foto.url)));
        expect((await sharp(saved).metadata()).format).toBe(format);
        expect(foto.tamanho).toBe(saved.length);
        expect(foto.mime_type).toBe(`image/${format}`);
    });
    test.each([
        ["HTML", Buffer.from("<html><script>alert(1)</script></html>"), "image/jpeg"],
        ["SVG", Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"/>'), "image/png"],
        ["fake signature", Buffer.from([255,216,255,0,0,0]), "image/jpeg"],
        ["oversized", Buffer.alloc(5 * 1024 * 1024 + 1), "image/png"],
    ])("rejects %s without filesystem writes", async (name, buffer, mime) => {
        await expect(service.adicionarFotos("item", [image(buffer, mime)], "owner")).rejects.toMatchObject({ statusCode: 400 });
        expect(await fs.readdir(directory)).toEqual([]);
        expect(repository.adicionarFotos).not.toHaveBeenCalled();
    });
    test("rejects MIME mismatch, truncated pixels and excessive dimensions", async () => {
        await expect(canonicalItemImage(image(png, "image/jpeg"))).rejects.toMatchObject({ statusCode: 400 });
        await expect(canonicalItemImage(image(png.subarray(0, png.length - 20)))).rejects.toMatchObject({ statusCode: 400 });
        const wide = await sharp({ create: { width: 4097, height: 1, channels: 3, background: "red" } }).png().toBuffer();
        await expect(canonicalItemImage(image(wide))).rejects.toMatchObject({ statusCode: 400 });
    });
    test("rejects PNG animation chunks before decoding", async () => {
        const animation = Buffer.concat([png.subarray(0, 8), Buffer.from([0,0,0,0]), Buffer.from("acTL"), Buffer.alloc(4), png.subarray(8)]);
        await expect(canonicalItemImage(image(animation))).rejects.toMatchObject({ statusCode: 400 });
    });
    test("removes appended HTML payload from accepted image", async () => {
        const marker = Buffer.from("<script>unsafe-marker</script>");
        const canonical = await canonicalItemImage(image(Buffer.concat([png, marker])));
        expect(canonical.buffer.includes(marker)).toBe(false);
    });
    test("checks ownership before any public directory or file is created", async () => {
        await expect(service.adicionarFotos("item", [image()], "other")).rejects.toMatchObject({ statusCode: 403 });
        expect(await fs.readdir(directory)).toEqual([]);
    });
    test("validates the whole batch before writing the first file", async () => {
        await expect(service.adicionarFotos("item", [image(), image(Buffer.from("html"))], "owner")).rejects.toMatchObject({ statusCode: 400 });
        expect(await fs.readdir(directory)).toEqual([]);
    });
    test.each([new Error("database failure"), null])("cleans its own newly written files on persistence failure %s", async result => {
        if (result) repository.adicionarFotos.mockRejectedValue(result);
        else repository.adicionarFotos.mockResolvedValue(null);
        await expect(service.adicionarFotos("item", [image(), image()], "owner")).rejects.toBeDefined();
        expect(await fs.readdir(service.directory)).toEqual([]);
    });
    test("rejects empty batches and aggregate count above five", async () => {
        await expect(service.adicionarFotos("item", [], "owner")).rejects.toMatchObject({ statusCode: 400 });
        repository.buscarPorId.mockResolvedValue({ usuario_id: "owner", status: "DISPONIVEL", fotos: Array(5).fill({}) });
        await expect(service.adicionarFotos("item", [image()], "owner")).rejects.toMatchObject({ statusCode: 400 });
    });
    test("exact matching prevents partial filename deletion and database failure preserves file", async () => {
        await fs.mkdir(service.directory);
        await fs.writeFile(path.join(service.directory, "abcdef.png"), png);
        repository.buscarPorId.mockResolvedValue({ usuario_id: "owner", fotos: [{ _id: "photo", url: "/uploads/itens/abcdef.png" }] });
        await expect(service.removerFoto("item", "abc", "owner")).rejects.toMatchObject({ statusCode: 404 });
        repository.atualizar.mockRejectedValue(new Error("database failure"));
        await expect(service.removerFoto("item", "photo", "owner")).rejects.toThrow("database failure");
        expect(await fs.readFile(path.join(service.directory, "abcdef.png"))).toEqual(png);
    });
    test("multer bounds file size and count without disk storage", async () => {
        const app = express();
        app.post("/upload", uploadFotos.array("fotos", 5), (req, res) => res.json({ count: req.files.length }));
        app.use((err, req, res, next) => res.status(400).json({ code: err.code }));
        const large = await request(app).post("/upload").attach("fotos", Buffer.alloc(5 * 1024 * 1024 + 1), { filename: "large.png", contentType: "image/png" });
        expect(large.status).toBe(400);
        expect(large.body.code).toBe("LIMIT_FILE_SIZE");
        let six = request(app).post("/upload");
        for (let i = 0; i < 6; i++) six = six.attach("fotos", png, { filename: "x.png", contentType: "image/png" });
        expect((await six).status).toBe(400);
        const single = await request(app).post("/upload").attach("fotos", png, { filename: "x.html", contentType: "image/png" });
        expect(single.status).toBe(200);
        let five = request(app).post("/upload");
        for (let i = 0; i < 5; i++) five = five.attach("fotos", png, { filename: "x.png", contentType: "image/png" });
        expect((await five).status).toBe(200);
    });
});
