import { beforeEach, describe, expect, jest, test} from "@jest/globals";
import PerfilService from "../../services/PerfilService.js";
import PerfilRepository from "../../repositories/PerfilRepository.js";
import CustomError from "../../utils/helpers/CustomError.js";


jest.mock("../../repositories/PerfilRepository.js", () => ({
    atualizar: jest.fn(),
    buscarPorId: jest.fn(),
    buscarPorEmail: jest.fn(),
}));

describe("PerfilService", () => {
    beforeEach(async () => {
        jest.clearAllMocks();
    });

    test("deve alterar perfil do usuário com sucesso", async () => {
        const usuarioMock = { _id: "123", perfil: "ADMINISTRADOR", situacao: "ATIVO" };
        PerfilRepository.atualizar.mockResolvedValue(usuarioMock);

        const res = await PerfilService.alterarAcessoUsuario("123", { perfil: "ADMINISTRADOR" });

        expect(res.perfil).toBe("ADMINISTRADOR");
        expect(PerfilRepository.atualizar).toHaveBeenCalledWith("123", { perfil: "ADMINISTRADOR" });
    });

    test("deve lançar 400 se nenhum dado for enviado", async () => {
        await expect(PerfilService.alterarAcessoUsuario("123", {}))
            .rejects.toMatchObject({ statusCode: 400 });
    });

    test("deve lançar 404 se o usuário não for encontrado", async () => {
        PerfilRepository.atualizar.mockResolvedValue(null);
        await expect(PerfilService.alterarAcessoUsuario("inexistente", { situacao: "INATIVO" }))
            .rejects.toMatchObject({ statusCode: 404 });
    });

    test("deve retornar o perfil do usuário autenticado", async () => {
        const usuarioMock = { _id: "123", email: "usuario@doai.com" };
        PerfilRepository.buscarPorId.mockResolvedValue(usuarioMock);

        await expect(PerfilService.buscarPerfil("123")).resolves.toEqual(usuarioMock);
    });

    test("deve atualizar somente o perfil do usuário autenticado", async () => {
        const usuarioMock = { _id: "123", email: "usuario@doai.com" };
        const atualizado = { ...usuarioMock, cidade: "Cuiabá" };
        PerfilRepository.buscarPorId.mockResolvedValue(usuarioMock);
        PerfilRepository.atualizar.mockResolvedValue(atualizado);

        await expect(PerfilService.atualizarPerfil("123", { cidade: "Cuiabá" }))
            .resolves.toEqual(atualizado);
        expect(PerfilRepository.atualizar).toHaveBeenCalledWith("123", { cidade: "Cuiabá" });
    });

    test("deve desativar o perfil sem apagar o histórico", async () => {
        PerfilRepository.buscarPorId.mockResolvedValue({ _id: "123", situacao: "ATIVO" });
        PerfilRepository.atualizar.mockResolvedValue({ _id: "123", situacao: "INATIVO" });

        await expect(PerfilService.desativarPerfil("123")).resolves.toEqual({
            message: "Conta desativada com sucesso.",
        });
        expect(PerfilRepository.atualizar).toHaveBeenCalledWith("123", { situacao: "INATIVO" });
    });
});
