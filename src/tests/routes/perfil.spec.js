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
const mockBuscarPorCpf = jest.fn();
const mockCompletarCadastro = jest.fn();

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
        buscarPorCpf(...args) {
            return mockBuscarPorCpf(...args);
        }
        completarCadastro(...args) {
            return mockCompletarCadastro(...args);
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
    cadastro_completo: true
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
    mockBuscarPorCpf
        .mockReset()
        .mockResolvedValue(null);

    mockCompletarCadastro
        .mockReset()
        .mockImplementation(async (id, dados) => ({
            ...usuariosAtuais.get(String(id)),
            ...dados,
            _id: id,
            cadastro_completo: true
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
describe("PATCH /perfil/completar-cadastro", () => {
    const rota = "/perfil/completar-cadastro";

    const dadosValidos = {
        cpf: "123.456.789-09",
        telefone: "69999999999",
        cidade: "Vilhena",
        uf: "RO",
        termos: true
    };

    const usuarioIncompleto = () =>
        createRegularUser({
            cadastro_completo: false
        });

    const completarCadastro = (body = dadosValidos, usuario = usuarioIncompleto()) =>
        request(app)
            .patch(rota)
            .set("Authorization", createTestBearer(usuario))
            .send(body);

    beforeEach(() => {
        usuariosAtuais.set(testIds.usuario, {
            ...usuarioAtual(testIds.usuario, "USUARIO"),
            cadastro_completo: false,
            cpf: null,
            telefone: null,
            cidade: null,
            uf: null
        });
    });

    test("deve completar o cadastro do usuário autenticado", async () => {
        const response = await completarCadastro();

        expect(response.statusCode).toBe(200);

        expect(response.body.data).toMatchObject({
            _id: testIds.usuario,
            cpf: "12345678909",
            telefone: "69999999999",
            cidade: "Vilhena",
            uf: "RO",
            cadastro_completo: true,
            versao_termos: "1.0"
        });

        expect(mockCompletarCadastro).toHaveBeenCalledWith(testIds.usuario, expect.objectContaining({
            cpf: "12345678909",
            telefone: dadosValidos.telefone,
            cidade: dadosValidos.cidade,
            uf: dadosValidos.uf,
            termos_aceitos_em: expect.any(Date),
            versao_termos: "1.0"
        })
        );

        expect(mockCompletarCadastro).toHaveBeenCalledTimes(1);
    });

    test("deve exigir autenticação", async () => {
        const response = await request(app).patch(rota).send(dadosValidos);

        expect(response.statusCode).toBe(498);
        expect(mockCompletarCadastro).not.toHaveBeenCalled();
    });

    test.each([
        "cpf",
        "telefone",
        "cidade",
        "uf",
        "termos"
    ])("deve rejeitar ausência do campo %s", async (campo) => {
        const dados = { ...dadosValidos };

        delete dados[campo];

        const response = await completarCadastro(dados);

        expect(response.statusCode).toBe(400);
        expect(mockCompletarCadastro).not.toHaveBeenCalled();
    });

    test("deve rejeitar CPF inválido", async () => {
        const response = await completarCadastro({
            ...dadosValidos,
            cpf: "111.111.111-11"
        });

        expect(response.statusCode).toBe(400);
        expect(mockCompletarCadastro).not.toHaveBeenCalled();
    });

    test("deve rejeitar telefone inválido", async () => {
        const response = await completarCadastro({
            ...dadosValidos,
            telefone: "123"
        });

        expect(response.statusCode).toBe(400);
        expect(mockCompletarCadastro).not.toHaveBeenCalled();
    });

    test("deve rejeitar UF inexistente", async () => {
        const response = await completarCadastro({
            ...dadosValidos,
            uf: "XX"
        });

        expect(response.statusCode).toBe(400);
        expect(mockCompletarCadastro).not.toHaveBeenCalled();
    });

    test("deve exigir aceite dos termos", async () => {
        const response = await completarCadastro({
            ...dadosValidos,
            termos: false
        });

        expect(response.statusCode).toBe(400);
        expect(mockCompletarCadastro).not.toHaveBeenCalled();
    });

    test("deve rejeitar CPF pertencente a outro usuário", async () => {
        mockBuscarPorCpf.mockResolvedValue({
            _id: testIds.doador
        });

        const response = await completarCadastro();

        expect(response.statusCode).toBe(409);
        expect(mockCompletarCadastro).not.toHaveBeenCalled();
    });

    test("deve rejeitar cadastro já concluído", async () => {
        usuariosAtuais.set(testIds.usuario, {
            ...usuariosAtuais.get(testIds.usuario),
            cadastro_completo: true
        });

        const response = await completarCadastro();

        expect(response.statusCode).toBe(409);
        expect(mockCompletarCadastro).not.toHaveBeenCalled();
    });

    test.each([
        "SUSPENSO",
        "INATIVO"
    ])("deve rejeitar usuário com situação %s", async (situacao) => {
        usuariosAtuais.set(testIds.usuario, {
            ...usuariosAtuais.get(testIds.usuario),
            situacao
        });

        const response = await completarCadastro();

        expect(response.statusCode).toBe(403);
        expect(mockCompletarCadastro).not.toHaveBeenCalled();
    });

    test.each([
        ["id", testIds.doador],
        ["perfil", "ADMINISTRADOR"],
        ["situacao", "ATIVO"],
        ["cadastro_completo", true],
        ["email", "alterado@example.invalid"],
        ["nome", "Nome alterado"],
        ["versao_termos", "9.9"],
        ["termos_aceitos_em", "2020-01-01"]
    ])("deve rejeitar mass assignment do campo %s", async (campo, valor) => {
        const response = await completarCadastro({
            ...dadosValidos,
            [campo]: valor
        });

        expect(response.statusCode).toBe(400);
        expect(mockCompletarCadastro).not.toHaveBeenCalled();
    });

    test("deve retornar conflito quando atualização não é realizada", async () => {
        mockCompletarCadastro.mockResolvedValue(null);

        const response = await completarCadastro();

        expect(response.statusCode).toBe(409);
    });

    test("deve permitir consultar o próprio perfil incompleto", async () => {
        PerfilRepository.buscarPorId.mockResolvedValue({
            _id: testIds.usuario,
            cadastro_completo: false
        });

        const response = await request(app)
            .get("/perfil")
            .set("Authorization", createTestBearer(usuarioIncompleto()));

        expect(response.statusCode).toBe(200);

        expect(response.body.data).toMatchObject({
            cadastro_completo: false
        });
    });

    test("deve bloquear atualização comum de perfil incompleto", async () => {
        const response = await request(app)
            .put("/perfil")
            .set("Authorization", createTestBearer(usuarioIncompleto()))
            .send({
                cidade: "Cuiabá"
            });

        expect(response.statusCode).toBe(403);
        expect(PerfilRepository.atualizar).not.toHaveBeenCalled();
    });
});