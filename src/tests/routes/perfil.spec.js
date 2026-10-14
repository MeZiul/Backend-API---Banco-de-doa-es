import express from "express";
import request from "supertest";
import { beforeAll, beforeEach, describe, expect, jest, test } from "@jest/globals";
import PerfilRepository from "../../repositories/PerfilRepository.js";
import {
    createAdminUser,
    createRegularUser,
    createTestBearer,
    testIds,
} from "../test.js";
import errorHandler from "../../utils/helpers/errorHandler.js";

const mockRevogarSessoesUsuario = jest.fn();
const mockBuscarUsuarioAtual = jest.fn();

jest.mock("../../repositories/PerfilRepository.js", () => ({
    __esModule: true,
    default: {
        atualizar: jest.fn(),
        buscarPorId: jest.fn(),
        buscarPorEmail: jest.fn(),
    },
}));

jest.mock("../../repositories/UsuarioRepository.js", () => ({
    __esModule: true,
    default: class MockUsuarioRepository {
        buscarPorId(...args) {
            return mockBuscarUsuarioAtual(...args);
        }
    },
}));

jest.mock("../../containers/services.autenticacao.container.js", () => ({
    __esModule: true,
    autenticacaoService: {
        revogarSessoesUsuario: mockRevogarSessoesUsuario,
    },
}));

jest.mock("../../infra/PrismaTransactionManager.js", () => ({
    __esModule: true,
    default: {
        run: (operation) => operation(),
    },
}));

const usuarioAtual = (id, perfil, situacao = "ATIVO") => ({
    _id: id,
    nome: "Pessoa de teste",
    email: "pessoa@example.invalid",
    perfil,
    situacao,
});

const adminClaims = () => createAdminUser({ papeis: ["ADMINISTRADOR"] });
const usuarioClaims = () => createRegularUser({ papeis: ["USUARIO"] });
const perfilPath = (id) => `/admin/usuarios/${id}/perfil`;

let app;
let usuariosAtuais;

const patchPerfil = (id, requester, body) => {
    let patch = request(app).patch(perfilPath(id));
    if (requester) {
        patch = patch.set("Authorization", createTestBearer(requester));
    }
    return patch.send(body);
};

const expectNenhumaAlteracaoDeAcesso = () => {
    expect(PerfilRepository.atualizar).not.toHaveBeenCalled();
    expect(mockRevogarSessoesUsuario).not.toHaveBeenCalled();
};

beforeAll(async () => {
    const { default: perfilRouter } = await import(
        "../../routes/perfilRoutes.js"
    );

    app = express();
    app.use(express.json());
    app.use(perfilRouter);
    app.use(errorHandler);
});

beforeEach(() => {
    Object.values(PerfilRepository).forEach((mockFn) => mockFn.mockReset?.());
    mockRevogarSessoesUsuario.mockReset().mockResolvedValue(undefined);

    usuariosAtuais = new Map([
        [testIds.admin, usuarioAtual(testIds.admin, "ADMINISTRADOR")],
        [testIds.usuario, usuarioAtual(testIds.usuario, "USUARIO")],
        [testIds.doador, usuarioAtual(testIds.doador, "USUARIO")],
    ]);
    mockBuscarUsuarioAtual
        .mockReset()
        .mockImplementation(async (id) => usuariosAtuais.get(String(id)) ?? null);

    PerfilRepository.atualizar.mockImplementation(async (id, dados) => ({
        _id: id,
        ...dados,
    }));
});

describe("Rotas de perfil pessoal", () => {
    test("GET /perfil consulta somente o perfil do usuário autenticado", async () => {
        PerfilRepository.buscarPorId.mockResolvedValue({
            _id: testIds.usuario,
            email: "usuario@example.invalid",
        });

        const response = await request(app)
            .get("/perfil")
            .set("Authorization", createTestBearer(usuarioClaims()));

        expect(response.statusCode).toBe(200);
        expect(response.body.data).toMatchObject({ _id: testIds.usuario });
        expect(PerfilRepository.buscarPorId).toHaveBeenCalledWith(testIds.usuario);
    });

    test("PUT /perfil atualiza somente os campos de perfil permitidos", async () => {
        PerfilRepository.buscarPorId.mockResolvedValue({
            _id: testIds.usuario,
            email: "usuario@example.invalid",
        });
        PerfilRepository.atualizar.mockResolvedValue({
            _id: testIds.usuario,
            cidade: "Cuiabá",
        });

        const response = await request(app)
            .put("/perfil")
            .set("Authorization", createTestBearer(usuarioClaims()))
            .send({ cidade: "Cuiabá" });

        expect(response.statusCode).toBe(200);
        expect(PerfilRepository.atualizar).toHaveBeenCalledWith(
            testIds.usuario,
            { cidade: "Cuiabá" },
        );
    });

    test("PUT /perfil rejeita mass assignment de acesso e campos administrativos", async () => {
        const response = await request(app)
            .put("/perfil")
            .set("Authorization", createTestBearer(usuarioClaims()))
            .send({
                cidade: "Cuiabá",
                perfil: "ADMINISTRADOR",
                situacao: "ATIVO",
                id: testIds.doador,
                total_doacoes: 999,
            });

        expect(response.statusCode).toBe(400);
        expect(PerfilRepository.buscarPorId).not.toHaveBeenCalled();
        expect(PerfilRepository.atualizar).not.toHaveBeenCalled();
        expect(mockRevogarSessoesUsuario).not.toHaveBeenCalled();
    });

    test("DELETE /perfil desativa a conta autenticada e revoga suas sessões", async () => {
        PerfilRepository.buscarPorId.mockResolvedValue({
            _id: testIds.usuario,
            situacao: "ATIVO",
        });
        PerfilRepository.atualizar.mockResolvedValue({
            _id: testIds.usuario,
            situacao: "INATIVO",
        });

        const response = await request(app)
            .delete("/perfil")
            .set("Authorization", createTestBearer(usuarioClaims()));

        expect(response.statusCode).toBe(204);
        expect(PerfilRepository.atualizar).toHaveBeenCalledWith(
            testIds.usuario,
            { situacao: "INATIVO" },
        );
        expect(mockRevogarSessoesUsuario).toHaveBeenCalledWith(testIds.usuario);
    });
});

describe("PATCH /admin/usuarios/:id/perfil", () => {
    test("exige autenticação e não altera acesso sem token", async () => {
        const response = await patchPerfil(testIds.doador, null, {
            perfil: "USUARIO",
        });

        expect(response.statusCode).toBe(498);
        expect(mockBuscarUsuarioAtual).not.toHaveBeenCalled();
        expectNenhumaAlteracaoDeAcesso();
    });

    test("recusa usuário comum sem alterar acesso", async () => {
        const response = await patchPerfil(
            testIds.doador,
            usuarioClaims(),
            { perfil: "USUARIO" },
        );

        expect(response.statusCode).toBe(403);
        expect(mockBuscarUsuarioAtual).toHaveBeenCalledWith(testIds.usuario);
        expectNenhumaAlteracaoDeAcesso();
    });

    test("recusa administrador suspenso sem alterar acesso", async () => {
        usuariosAtuais.set(
            testIds.admin,
            usuarioAtual(testIds.admin, "ADMINISTRADOR", "SUSPENSO"),
        );

        const response = await patchPerfil(testIds.doador, adminClaims(), {
            perfil: "USUARIO",
        });

        expect(response.statusCode).toBe(403);
        expectNenhumaAlteracaoDeAcesso();
    });

    test("não aceita claim administrativa obsoleta quando o banco indica usuário comum", async () => {
        usuariosAtuais.set(
            testIds.admin,
            usuarioAtual(testIds.admin, "USUARIO"),
        );

        const response = await patchPerfil(testIds.doador, adminClaims(), {
            perfil: "USUARIO",
        });

        expect(response.statusCode).toBe(403);
        expect(mockBuscarUsuarioAtual).toHaveBeenCalledWith(testIds.admin);
        expectNenhumaAlteracaoDeAcesso();
    });

    test("recusa alteração do próprio perfil sem alterar acesso", async () => {
        const response = await patchPerfil(testIds.admin, adminClaims(), {
            perfil: "USUARIO",
        });

        expect(response.statusCode).toBe(403);
        expectNenhumaAlteracaoDeAcesso();
    });

    test("recusa concessão de nível igual ao do administrador", async () => {
        const response = await patchPerfil(testIds.doador, adminClaims(), {
            perfil: "ADMINISTRADOR",
        });

        expect(response.statusCode).toBe(403);
        expectNenhumaAlteracaoDeAcesso();
    });

    test("rejeita perfil desconhecido sem alterar acesso", async () => {
        const response = await patchPerfil(testIds.doador, adminClaims(), {
            perfil: "SUPERADMIN",
        });

        expect(response.statusCode).toBe(400);
        expectNenhumaAlteracaoDeAcesso();
    });

    test("permite atribuir nível inferior a terceiro e descarta campos extras do payload", async () => {
        const response = await patchPerfil(testIds.doador, adminClaims(), {
            perfil: "USUARIO",
            id: testIds.admin,
            papeis: ["ADMINISTRADOR"],
            total_doacoes: 999,
        });

        expect(response.statusCode).toBe(200);
        expect(response.body.data).toMatchObject({
            _id: testIds.doador,
            perfil: "USUARIO",
        });
        expect(PerfilRepository.atualizar).toHaveBeenCalledTimes(1);
        expect(PerfilRepository.atualizar).toHaveBeenCalledWith(
            testIds.doador,
            { perfil: "USUARIO" },
        );
        expect(mockRevogarSessoesUsuario).toHaveBeenCalledTimes(1);
        expect(mockRevogarSessoesUsuario).toHaveBeenCalledWith(testIds.doador);
    });

    test("permite alterar a situação de terceiro e revoga suas sessões", async () => {
        const response = await patchPerfil(testIds.doador, adminClaims(), {
            situacao: "SUSPENSO",
        });

        expect(response.statusCode).toBe(200);
        expect(response.body.data).toMatchObject({
            _id: testIds.doador,
            situacao: "SUSPENSO",
        });
        expect(PerfilRepository.atualizar).toHaveBeenCalledTimes(1);
        expect(PerfilRepository.atualizar).toHaveBeenCalledWith(
            testIds.doador,
            { situacao: "SUSPENSO" },
        );
        expect(mockRevogarSessoesUsuario).toHaveBeenCalledTimes(1);
        expect(mockRevogarSessoesUsuario).toHaveBeenCalledWith(testIds.doador);
    });
});
