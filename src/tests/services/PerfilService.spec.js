import { beforeEach, describe, expect, jest, test} from "@jest/globals";
import PerfilService from "../../services/PerfilService.js";
import PerfilRepository from "../../repositories/PerfilRepository.js";
import CustomError from "../../utils/helpers/CustomError.js";


jest.mock("../../repositories/PerfilRepository.js", () => ({
    atualizar: jest.fn(),
    buscarPorId: jest.fn(),
    buscarPorEmail: jest.fn(),
}));

const autenticacaoService = {
    revogarSessoesUsuario: jest.fn(),
};
const transactionManager = {
    run: jest.fn((operation) => operation()),
};
let perfilService;

describe("PerfilService", () => {
    beforeEach(async () => {
        jest.clearAllMocks();
        autenticacaoService.revogarSessoesUsuario.mockResolvedValue(undefined);
        transactionManager.run.mockImplementation((operation) => operation());
        perfilService = new PerfilService({
            perfilRepository: PerfilRepository,
            autenticacaoService,
            transactionManager,
        });
    });

    test("deve alterar perfil do usuário com sucesso", async () => {
        const usuarioMock = { _id: "123", perfil: "ADMINISTRADOR", situacao: "ATIVO" };
        PerfilRepository.atualizar.mockResolvedValue(usuarioMock);

        const res = await perfilService.alterarAcessoUsuario("123", { perfil: "ADMINISTRADOR" });

        expect(res.perfil).toBe("ADMINISTRADOR");
        expect(PerfilRepository.atualizar).toHaveBeenCalledWith("123", { perfil: "ADMINISTRADOR" });
        expect(autenticacaoService.revogarSessoesUsuario).toHaveBeenCalledWith("123");
        expect(autenticacaoService.revogarSessoesUsuario.mock.invocationCallOrder[0])
            .toBeGreaterThan(PerfilRepository.atualizar.mock.invocationCallOrder[0]);
        expect(transactionManager.run).toHaveBeenCalledTimes(1);
    });

    test("deve revogar sessões ao alterar a situação do usuário", async () => {
        PerfilRepository.atualizar.mockResolvedValue({ _id: "123", situacao: "SUSPENSO" });

        await perfilService.alterarAcessoUsuario("123", { situacao: "SUSPENSO" });

        expect(autenticacaoService.revogarSessoesUsuario).toHaveBeenCalledWith("123");
    });

    test("deve lançar 400 se nenhum dado for enviado", async () => {
        await expect(perfilService.alterarAcessoUsuario("123", {}))
            .rejects.toMatchObject({ statusCode: 400 });
    });

    test("deve lançar 404 se o usuário não for encontrado", async () => {
        PerfilRepository.atualizar.mockResolvedValue(null);
        await expect(perfilService.alterarAcessoUsuario("inexistente", { situacao: "INATIVO" }))
            .rejects.toMatchObject({ statusCode: 404 });
        expect(autenticacaoService.revogarSessoesUsuario).not.toHaveBeenCalled();
    });

    test("deve retornar o perfil do usuário autenticado", async () => {
        const usuarioMock = { _id: "123", email: "usuario@doai.com" };
        PerfilRepository.buscarPorId.mockResolvedValue(usuarioMock);

        await expect(perfilService.buscarPerfil("123")).resolves.toEqual(usuarioMock);
    });

    test("deve atualizar somente o perfil do usuário autenticado", async () => {
        const usuarioMock = { _id: "123", email: "usuario@doai.com" };
        const atualizado = { ...usuarioMock, cidade: "Cuiabá" };
        PerfilRepository.buscarPorId.mockResolvedValue(usuarioMock);
        PerfilRepository.atualizar.mockResolvedValue(atualizado);

        await expect(perfilService.atualizarPerfil("123", { cidade: "Cuiabá" }))
            .resolves.toEqual(atualizado);
        expect(PerfilRepository.atualizar).toHaveBeenCalledWith("123", { cidade: "Cuiabá" });
        expect(autenticacaoService.revogarSessoesUsuario).not.toHaveBeenCalled();
    });

    test("deve desativar o perfil sem apagar o histórico", async () => {
        PerfilRepository.buscarPorId.mockResolvedValue({ _id: "123", situacao: "ATIVO" });
        PerfilRepository.atualizar.mockResolvedValue({ _id: "123", situacao: "INATIVO" });

        await expect(perfilService.desativarPerfil("123")).resolves.toEqual({
            message: "Conta desativada com sucesso.",
        });
        expect(PerfilRepository.atualizar).toHaveBeenCalledWith("123", { situacao: "INATIVO" });
        expect(autenticacaoService.revogarSessoesUsuario).toHaveBeenCalledWith("123");
        expect(transactionManager.run).toHaveBeenCalledTimes(1);
    });

    test("não deve revogar nem alterar uma conta que já está inativa", async () => {
        PerfilRepository.buscarPorId.mockResolvedValue({ _id: "123", situacao: "INATIVO" });

        await expect(perfilService.desativarPerfil("123"))
            .rejects.toMatchObject({ statusCode: 400 });

        expect(PerfilRepository.atualizar).not.toHaveBeenCalled();
        expect(autenticacaoService.revogarSessoesUsuario).not.toHaveBeenCalled();
    });

    test("deve propagar falha ao revogar sessões durante a alteração de acesso", async () => {
        const erroRevogacao = new Error("falha controlada na revogação");
        PerfilRepository.atualizar.mockResolvedValue({ _id: "123", perfil: "ADMINISTRADOR" });
        autenticacaoService.revogarSessoesUsuario.mockRejectedValue(erroRevogacao);

        await expect(
            perfilService.alterarAcessoUsuario("123", { perfil: "ADMINISTRADOR" }),
        ).rejects.toBe(erroRevogacao);
    });
});
