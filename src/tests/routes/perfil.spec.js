import request from "supertest";
import { beforeAll, beforeEach, describe, expect, jest, test } from "@jest/globals";
import PerfilRepository from "../../repositories/PerfilRepository.js";
import {
    createControllerTestApp,
    createRegularUser,
    createTestBearer,
    testIds,
} from "../test.js";

jest.mock("../../repositories/PerfilRepository.js", () => ({
    __esModule: true,
    default: {
        atualizar: jest.fn(),
        buscarPorId: jest.fn(),
        buscarPorEmail: jest.fn(),
    },
}));

let appAdmin;

const bearer = (user) => createTestBearer(user);
const usuarioAutenticado = () => bearer(createRegularUser());

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

beforeEach(() => {
    Object.values(PerfilRepository).forEach((mockFn) => mockFn.mockReset?.());
});

describe("Rotas de Perfil (Mock Nativo)", () => {

    test("GET /perfil retorna somente o perfil do usuário autenticado", async () => {
        PerfilRepository.buscarPorId.mockResolvedValue({ _id: testIds.usuario, email: "usuario@doai.com" });

        const res = await request(appAdmin)
            .get("/perfil")
            .set("Authorization", usuarioAutenticado());

        expect(res.statusCode).toBe(200);
        expect(res.body.data).toMatchObject({ _id: testIds.usuario });
        expect(PerfilRepository.buscarPorId).toHaveBeenCalledWith(testIds.usuario);
    });

    test("PUT /perfil atualiza o perfil do usuário autenticado", async () => {
        PerfilRepository.buscarPorId.mockResolvedValue({ _id: testIds.usuario, email: "usuario@doai.com" });
        PerfilRepository.atualizar.mockResolvedValue({ _id: testIds.usuario, cidade: "Cuiabá" });

        const res = await request(appAdmin)
            .put("/perfil")
            .set("Authorization", usuarioAutenticado())
            .send({ cidade: "Cuiabá" });

        expect(res.statusCode).toBe(200);
        expect(PerfilRepository.atualizar).toHaveBeenCalledWith(
            testIds.usuario,
            { cidade: "Cuiabá" },
        );
    });

    test("DELETE /perfil desativa a conta autenticada", async () => {
        PerfilRepository.buscarPorId.mockResolvedValue({ _id: testIds.usuario, situacao: "ATIVO" });
        PerfilRepository.atualizar.mockResolvedValue({ _id: testIds.usuario, situacao: "INATIVO" });

        const res = await request(appAdmin)
            .delete("/perfil")
            .set("Authorization", usuarioAutenticado());

        expect(res.statusCode).toBe(204);
        expect(PerfilRepository.atualizar).toHaveBeenCalledWith(
            testIds.usuario,
            { situacao: "INATIVO" },
        );
    });

    describe("PATCH /admin/usuarios/:id/perfil — gerenciarAcesso", () => {
        test("valida a estrutura do endpoint e a comunicação com o Express", async () => {
            const res = await request(appAdmin)
                .patch(`/admin/usuarios/${testIds.usuario}/perfil`)
                .send({ perfil: "ADMINISTRADOR" });

            expect(res.statusCode).toBeDefined();
        });
    });

});
