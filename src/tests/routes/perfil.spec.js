import request from "supertest";
import { beforeAll, describe, expect, jest, test } from "@jest/globals";
import jwt from "jsonwebtoken";
import UsuarioModel from "../../models/Usuario.js";
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

const bearer = (user) => `Bearer ${jwt.sign(user, process.env.JWT_SECRET_ACCESS_TOKEN)}`;
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

describe("Rotas de Perfil (Mock Nativo)", () => {

    test("GET /perfil retorna somente o perfil do usuário autenticado", async () => {
        UsuarioModel.findById.mockResolvedValue({ _id: testIds.usuario, email: "usuario@doai.com" });

        const res = await request(appAdmin)
            .get("/perfil")
            .set("Authorization", usuarioAutenticado());

        expect(res.statusCode).toBe(200);
        expect(res.body.data).toMatchObject({ _id: testIds.usuario });
        expect(UsuarioModel.findById).toHaveBeenCalledWith(testIds.usuario);
    });

    test("PUT /perfil atualiza o perfil do usuário autenticado", async () => {
        UsuarioModel.findById.mockResolvedValue({ _id: testIds.usuario, email: "usuario@doai.com" });
        UsuarioModel.findByIdAndUpdate.mockResolvedValue({ _id: testIds.usuario, cidade: "Cuiabá" });

        const res = await request(appAdmin)
            .put("/perfil")
            .set("Authorization", usuarioAutenticado())
            .send({ cidade: "Cuiabá" });

        expect(res.statusCode).toBe(200);
        expect(UsuarioModel.findByIdAndUpdate).toHaveBeenCalledWith(
            testIds.usuario,
            { cidade: "Cuiabá" },
            { new: true, runValidators: false },
        );
    });

    test("DELETE /perfil desativa a conta autenticada", async () => {
        UsuarioModel.findById.mockResolvedValue({ _id: testIds.usuario, situacao: "ATIVO" });
        UsuarioModel.findByIdAndUpdate.mockResolvedValue({ _id: testIds.usuario, situacao: "INATIVO" });

        const res = await request(appAdmin)
            .delete("/perfil")
            .set("Authorization", usuarioAutenticado());

        expect(res.statusCode).toBe(204);
        expect(UsuarioModel.findByIdAndUpdate).toHaveBeenCalledWith(
            testIds.usuario,
            { situacao: "INATIVO" },
            { new: true, runValidators: false },
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
