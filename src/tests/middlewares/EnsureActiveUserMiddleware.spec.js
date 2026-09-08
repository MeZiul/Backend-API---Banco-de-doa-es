import { beforeEach, describe, expect, jest, test } from "@jest/globals";
import { createEnsureActiveUserMiddleware } from "../../middlewares/EnsureActiveUserMiddleware.js";
import EnsureAdminMiddleware from "../../middlewares/EnsureAdminMiddleware.js";
import { testIds } from "../test.js";

describe("EnsureActiveUserMiddleware", () => {
    let usuarioRepository;
    let middleware;
    let next;

    beforeEach(() => {
        usuarioRepository = {
            buscarPorId: jest.fn(),
        };
        middleware = createEnsureActiveUserMiddleware({ usuarioRepository });
        next = jest.fn();
    });

    test("Deve bloquear usuário suspenso mesmo quando o token ainda informa situação ativa", async () => {
        usuarioRepository.buscarPorId.mockResolvedValue({
            _id: testIds.usuario,
            perfil: "USUARIO",
            situacao: "SUSPENSO",
        });
        const req = {
            user: {
                id: testIds.usuario,
                perfil: "USUARIO",
                situacao: "ATIVO",
            },
        };

        await middleware(req, {}, next);

        expect(next).toHaveBeenCalledWith(expect.objectContaining({
            statusCode: 403,
            customMessage: "Somente usuários ativos podem realizar operações protegidas.",
        }));
    });

    test("Deve atualizar perfil e situação usando o estado atual do banco", async () => {
        usuarioRepository.buscarPorId.mockResolvedValue({
            _id: testIds.admin,
            nome: "Administrador",
            email: "admin@doai.test",
            perfil: "USUARIO",
            situacao: "ATIVO",
        });
        const req = {
            user: {
                id: testIds.admin,
                perfil: "ADMINISTRADOR",
                papeis: ["ADMINISTRADOR"],
                situacao: "ATIVO",
            },
        };

        await middleware(req, {}, next);

        expect(req.user).toMatchObject({
            id: testIds.admin,
            perfil: "USUARIO",
            papeis: ["USUARIO"],
            situacao: "ATIVO",
        });
        expect(next).toHaveBeenCalledWith();
    });

    test("Deve rejeitar identidade autenticada que não existe mais", async () => {
        usuarioRepository.buscarPorId.mockResolvedValue(null);

        await middleware({ user: { id: testIds.usuario } }, {}, next);

        expect(next).toHaveBeenCalledWith(expect.objectContaining({
            statusCode: 401,
            customMessage: "Usuário autenticado não encontrado.",
        }));
    });

    test("Deve remover privilégio administrativo antigo antes da autorização", async () => {
        usuarioRepository.buscarPorId.mockResolvedValue({
            _id: testIds.admin,
            perfil: "USUARIO",
            situacao: "ATIVO",
        });
        const req = {
            user: {
                id: testIds.admin,
                perfil: "ADMINISTRADOR",
                papeis: ["ADMINISTRADOR"],
                situacao: "ATIVO",
            },
        };

        await middleware(req, {}, next);
        const adminNext = jest.fn();
        EnsureAdminMiddleware(req, {}, adminNext);

        expect(adminNext).toHaveBeenCalledWith(expect.objectContaining({
            statusCode: 403,
            customMessage: "Apenas administradores podem realizar esta operação.",
        }));
    });
});
