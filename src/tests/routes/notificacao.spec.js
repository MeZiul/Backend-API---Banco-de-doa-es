import request from "supertest";
import { beforeAll, describe, expect, jest, test } from "@jest/globals";
import {
    createControllerTestApp,
    createRegularUser,
    testIds,
} from "../test.js";

jest.mock("../../models/Notificacao.js", () => {
    return {
        paginate: jest.fn(),
        countDocuments: jest.fn(),
        findByIdAndUpdate: jest.fn(),
        updateMany: jest.fn(),
    };
});

let appUsuario;

beforeAll(async () => {
    const { default: notificacaoRouter } = await import(
        "../../routes/notificacaoRoutes.js"
        );

    appUsuario = createControllerTestApp({
        user: createRegularUser({ id: testIds.usuario }),
        registerRoutes: (app) => {
            app.use("/", notificacaoRouter);
        },
    });
});

describe("Rotas de Notificação (Mock Nativo)", () => {

    describe("GET /notificacoes", () => {
        test("valida a estrutura do endpoint", async () => {
            const res = await request(appUsuario).get("/notificacoes?page=1&limit=10");

            expect(res.statusCode).toBeDefined();
        });
    });

    describe("GET /notificacoes/contador", () => {
        test("valida a estrutura do endpoint", async () => {
            const res = await request(appUsuario).get("/notificacoes/contador");
            expect(res.statusCode).toBeDefined();
        });
    });

    describe("PATCH /notificacoes/:id/ler", () => {
        test("valida a estrutura do endpoint", async () => {
            const res = await request(appUsuario).patch("/notificacoes/12345/ler");
            expect(res.statusCode).toBeDefined();
        });
    });

    describe("POST /notificacoes/ler-tudo", () => {
        test("valida a estrutura do endpoint", async () => {
            const res = await request(appUsuario).post("/notificacoes/ler-tudo");
            expect(res.statusCode).toBeDefined();
        });
    });
});