import { beforeEach, describe, expect, jest, test } from "@jest/globals";
import PerfilRepository from "../../repositories/PerfilRepository.js";

function criarContexto() {
    const delegate = {
        findUnique: jest.fn()
    }

    Object.defineProperty(PerfilRepository, "client", {
        configurable: true,
        value: { usuario: delegate }
    })

    return { delegate }
}

describe("PerfilRepository", () => {

    beforeEach(() => {
        jest.clearAllMocks()
    })

    test("utiliza o delegate usuario", () => {
        const { delegate } = criarContexto()

        expect(PerfilRepository.delegateName).toBe("usuario")
        expect(PerfilRepository.delegate).toBe(delegate)
    })

    test("remove espaços e converte e-mail para minúsculas", async () => {
        const { delegate } = criarContexto()

        delegate.findUnique.mockResolvedValue({
            id: "usuario-1",
            email: "maria@email.com",
        })

        await PerfilRepository.buscarPorEmail("  MARIA@EMAIL.COM  ")

        expect(delegate.findUnique).toHaveBeenCalledWith({
            where: { email: "maria@email.com" }
        })
    })

    test("retorna null quando o usuário não existe", async () => {
        const { delegate } = criarContexto()

        delegate.findUnique.mockResolvedValue(null)

        const resultado = await PerfilRepository.buscarPorEmail("inexistente@email.com")

        expect(resultado).toBeNull()
    })

    test.each([
        [123, "123"],
        [null, "null"],
        [undefined, "undefined"],
        ["", ""],
        ["   ", ""]
    ])(
        "converte entrada %s para o valor %s",
        async (entrada, esperado) => {
            const { delegate } = criarContexto()

            delegate.findUnique.mockResolvedValue(null)

            await PerfilRepository.buscarPorEmail(entrada)

            expect(delegate.findUnique).toHaveBeenCalledWith({
                where: { email: esperado }
            })
        }
    )

    test("propaga erros do Prisma durante a consulta", async () => {
        const { delegate } = criarContexto()
        const erro = new Error("Falha de conexão")

        delegate.findUnique.mockRejectedValue(erro)

        await expect(PerfilRepository.buscarPorEmail("maria@email.com")).rejects.toBe(erro)
    })

    test("mapeia o usuário, preservando dados públicos e removendo campos sensíveis", async () => {
        const { delegate } = criarContexto()

        delegate.findUnique.mockResolvedValue({
            id: "usuario-1",
            nome: "Maria",
            email: "maria@email.com",
            cidade: "Vilhena",
            uf: "RO",
            situacao: "ATIVO",
            perfil: "USUARIO",
            senha: "hash-da-senha",
            token_redefinicao: "token-secreto"
        })

        const resultado = await PerfilRepository.buscarPorEmail("maria@email.com")

        expect(resultado).toMatchObject({
            _id: "usuario-1",
            nome: "Maria",
            email: "maria@email.com",
            cidade: "Vilhena",
            uf: "RO",
            situacao: "ATIVO",
            perfil: "USUARIO"
        })

        expect(resultado).not.toHaveProperty("senha")
        expect(resultado).not.toHaveProperty("token_redefinicao")
    })
})