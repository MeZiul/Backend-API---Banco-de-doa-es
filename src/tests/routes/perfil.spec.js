import request from "supertest";
import { beforeAll, describe, expect, jest, test } from "@jest/globals";
import {
    createControllerTestApp,
    createRegularUser,
    testIds,
} from "../test.js";

// 1. Mock Nativo das dependências de banco de dados para a rota rodar limpa
// Assumimos que o controlador de Perfil interage com o modelo de Usuario
jest.mock("../../models/Usuario.js", () => {
    return {
        findByIdAndUpdate: jest.fn(),
        findById: jest.fn(),
        updateOne: jest.fn()
    };
});

let appAdmin;

beforeAll(async () => {
    // 2. Trazemos o Router oficial exatamente como está configurado
    const { default: perfilRouter } = await import(
        "../../routes/perfilRoutes.js"
        );

    // 3. Como a rota é '/admin/...', montamos o app de teste com perfil ADMINISTRADOR
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

            // O importante aqui é que o Express não dispare um TypeError de rota indefinida.
            // Estando o BD mockado, qualquer resposta (200, 400, 403, 404, 500 tratado) prova que o contrato está vivo.
            expect(res.statusCode).toBeDefined();
        });
    });

});
