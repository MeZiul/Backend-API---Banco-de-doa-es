import { describe, expect, jest, test } from "@jest/globals";
import EnsureCompleteRegistrationMiddleware from "../../middlewares/EnsureCompleteRegistrationMiddleware.js";

describe("EnsureCompleteRegistrationMiddleware", () => {
    const executarMiddleware = (user) => {
        const req = { user };
        const res = {};
        const next = jest.fn();

        EnsureCompleteRegistrationMiddleware(req, res, next);

        return next;
    };

    test("deve permitir usuário com cadastro completo", () => {
        const next = executarMiddleware({
            id: "usuario-1",
            perfil: "USUARIO",
            cadastro_completo: true
        });

        expect(next).toHaveBeenCalledTimes(1);
        expect(next).toHaveBeenCalledWith();
    });

    test("deve permitir administrador com cadastro completo", () => {
        const next = executarMiddleware({
            id: "admin-1",
            perfil: "ADMINISTRADOR",
            cadastro_completo: true
        });

        expect(next).toHaveBeenCalledTimes(1);
        expect(next).toHaveBeenCalledWith();
    });

    test("deve bloquear usuário com cadastro incompleto", () => {
        const next = executarMiddleware({
            id: "usuario-1",
            perfil: "USUARIO",
            cadastro_completo: false
        });

        expect(next).toHaveBeenCalledTimes(1);
        expect(next).toHaveBeenCalledWith(
            expect.objectContaining({
                statusCode: 403,
                errorType: "registrationIncomplete"
            })
        );
    });

    test("deve bloquear administrador com cadastro incompleto", () => {
        const next = executarMiddleware({
            id: "admin-1",
            perfil: "ADMINISTRADOR",
            cadastro_completo: false
        });

        expect(next).toHaveBeenCalledTimes(1);
        expect(next).toHaveBeenCalledWith(expect.objectContaining({
            statusCode: 403,
            errorType: "registrationIncomplete"
        }));
    });

    test.each([
        undefined,
        null,
        {},
        { perfil: "USUARIO" },
        { id: "" }
    ])("deve rejeitar usuário não autenticado: %j", (user) => {
        const next = executarMiddleware(user);

        expect(next).toHaveBeenCalledTimes(1);
        expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 401 }));
    });

    test.each([
        undefined,
        null,
        "true",
        "false",
        1,
        0,
        {},
        []
    ])("deve rejeitar estado cadastral inválido: %j", (valor) => {
        const next = executarMiddleware({
            id: "usuario-1",
            cadastro_completo: valor
        });

        expect(next).toHaveBeenCalledTimes(1);
        expect(next).toHaveBeenCalledWith(expect.objectContaining({
            statusCode: 403,
            errorType: "registrationIncomplete"
        })
        );
    });
});