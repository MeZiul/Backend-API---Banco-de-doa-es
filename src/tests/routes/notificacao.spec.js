import request from "supertest";
import { beforeAll, beforeEach, describe, expect, jest, test } from "@jest/globals";
import {
    createControllerTestApp,
    createRegularUser,
    testIds,
} from "../test.js";
import NotificacaoModel from "../../models/Notificacao.js";

jest.mock("../../models/Notificacao.js", () => {
    return {
        paginate: jest.fn(),
        countDocuments: jest.fn(),
        findOneAndUpdate: jest.fn(),
        updateMany: jest.fn(),
    };
});

jest.mock("../../middlewares/AuthMiddleware.js", () => (
    (_req, _res, next) => next()
));

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

beforeEach(() => {
    Object.values(NotificacaoModel).forEach((mockFn) => mockFn.mockReset());
});

describe("Rotas de Notificação (Mock Nativo)", () => {

    describe("GET /notificacoes", () => {
        test("retorna as notificações do usuário autenticado", async () => {
            const payload = { docs: [{ _id: testIds.administracao }] };
            NotificacaoModel.paginate.mockResolvedValue(payload);

            const res = await request(appUsuario).get("/notificacoes?page=1&limit=10");

            expect(res.statusCode).toBe(200);
            expect(res.body.data).toEqual(payload);
        });
    });

    describe("GET /notificacoes/contador", () => {
        test("retorna a quantidade de notificações não lidas", async () => {
            NotificacaoModel.countDocuments.mockResolvedValue(2);

            const res = await request(appUsuario).get("/notificacoes/contador");

            expect(res.statusCode).toBe(200);
            expect(res.body.data).toEqual({ nao_lidas: 2 });
        });
    });

    describe("PATCH /notificacoes/:id/ler", () => {
        test("marca uma notificação do usuário como lida", async () => {
            const payload = { _id: testIds.administracao, lida: true };
            NotificacaoModel.findOneAndUpdate.mockResolvedValue(payload);

            const res = await request(appUsuario)
                .patch(`/notificacoes/${testIds.administracao}/ler`);

            expect(res.statusCode).toBe(200);
            expect(res.body.data).toEqual(payload);
        });
    });

    describe("POST /notificacoes/ler-tudo", () => {
        test("marca todas as notificações do usuário como lidas", async () => {
            NotificacaoModel.updateMany.mockResolvedValue({ modifiedCount: 2 });

            const res = await request(appUsuario).post("/notificacoes/ler-tudo");

            expect(res.statusCode).toBe(200);
            expect(res.body.data).toEqual({ mensagem: "Marcado como Lidas" });
        });
    });
});
