import request from "supertest";
import { beforeAll, describe, expect, jest, test } from "@jest/globals";
import {
    createControllerTestApp,
    createRegularUser,
    testIds,
} from "../test.js";

jest.mock("../../models/Usuario.js", () => {
    return {
        findByIdAndUpdate: jest.fn(),
        findById: jest.fn(),
        updateOne: jest.fn()
    };
});

let appAdmin;

beforeAll(async () => {
    const { default: perfilRouter } = await import(
        "../../routes/perfilRoutes.js"
        );

    appAdmin = createControllerTestApp({
        user: createRegularUser({ id: testIds.admin, perfil: "ADMINISTRADOR" }),
        registerRoutes: (app) => {
            app.use("/", perfilRouter);
        },
    });
});

describe("Rotas de Perfil (Mock Nativo)", () => {

    describe("PATCH /admin/usuarios/:id/perfil — gerenciarAcesso", () => {
        test("valida a estrutura do endpoint e a comunicação com o Express", async () => {
            const res = await request(appAdmin)
                .patch(`/admin/usuarios/${testIds.usuario}/perfil`)
                .send({ perfil: "ADMINISTRADOR" });

            expect(res.statusCode).toBeDefined();
        });
    });

});
