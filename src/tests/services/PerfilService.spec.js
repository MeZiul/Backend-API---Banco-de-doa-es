import { beforeEach, describe, expect, jest, test} from "@jest/globals";
import PerfilService from "../../services/PerfilService.js";
import PerfilRepository from "../../repositories/PerfilRepository.js";
import CustomError from "../../utils/helpers/CustomError.js";


jest.mock("../../repositories/PerfilRepository.js", () => ({
    atualizar: jest.fn(),
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
});