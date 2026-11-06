import { describe, expect, test } from "@jest/globals";
import UsuarioFilterBuilder from "../../../repositories/filters/UsuarioFilterBuilder.js";

describe("UsuarioFilterBuilder", () => {

    test("inicializa com filtros vazios", () => {
        const builder = new UsuarioFilterBuilder()

        expect(builder.build()).toEqual({})
    })

    describe("filtros textuais", () => {

        test.each([
            ["comNome", "nome", "Maria"],
            ["comEmail", "email", "maria@email.com"],
            ["comCpf", "cpf", "123.456.789-00"],
            ["comCidade", "cidade", "Vilhena"]
        ])(
            "%s adiciona o filtro %s corretamente",
            (metodo, campo, valor) => {
                const builder = new UsuarioFilterBuilder()
                const resultado = builder[metodo](valor).build()

                expect(resultado).toEqual({ [campo]: { $regex: expect.any(String), $options: "i" } })

                const regex = new RegExp(resultado[campo].$regex, resultado[campo].$options)

                expect(regex.test(valor)).toBe(true)
                expect(regex.test(valor.toUpperCase())).toBe(true)
            }
        )

        test.each([
            ["comNome", "nome"],
            ["comEmail", "email"],
            ["comCpf", "cpf"],
            ["comCidade", "cidade"]
        ])(
            "%s escapa caracteres especiais de regex",
            (metodo, campo) => {
                const builder = new UsuarioFilterBuilder()
                const valor = "Teste.*+?^${}()|[]\\"
                const resultado = builder[metodo](valor).build()
                const regex = new RegExp(resultado[campo].$regex, resultado[campo].$options)

                expect(regex.test(valor)).toBe(true)
                expect(regex.test("Teste qualquer coisa")).toBe(false)
            }
        )

        test.each([null, undefined, "", false, 0])("ignora valores vazios nos filtros textuais: %s", (valor) => {
            const builder = new UsuarioFilterBuilder()
            const resultado = builder
                .comNome(valor)
                .comEmail(valor)
                .comCpf(valor)
                .comCidade(valor)
                .build()

            expect(resultado).toEqual({})
        })
    })

    describe("filtros simples", () => {

        test.each([
            ["comUf", "uf", "RO"],
            ["comSituacao", "situacao", "ATIVO"],
            ["comPerfil", "perfil", "ADMINISTRADOR"]
        ])(
            "%s adiciona corretamente o campo %s",
            (metodo, campo, valor) => {
                const builder = new UsuarioFilterBuilder()
                const resultado = builder[metodo](valor).build()

                expect(resultado).toEqual({ [campo]: valor })
            }
        )

        test("mantém a UF exatamente como informada", () => {
            const builder = new UsuarioFilterBuilder()

            expect(builder.comUf("ro").build()).toEqual({ uf: "ro" })
        })

        test.each([null, undefined, "", false, 0])("ignora valores vazios nos filtros simples: %s", (valor) => {
            const builder = new UsuarioFilterBuilder()
            const resultado = builder
                .comUf(valor)
                .comSituacao(valor)
                .comPerfil(valor)
                .build()

            expect(resultado).toEqual({})
        })
    })

    describe("combinação de filtros", () => {

        test("permite encadear todos os métodos", () => {
            const builder = new UsuarioFilterBuilder()

            expect(builder.comNome("Maria")).toBe(builder)
            expect(builder.comEmail("maria@email.com")).toBe(builder)
            expect(builder.comCpf("123")).toBe(builder)
            expect(builder.comCidade("Vilhena")).toBe(builder)
            expect(builder.comUf("RO")).toBe(builder)
            expect(builder.comSituacao("ATIVO")).toBe(builder)
            expect(builder.comPerfil("USUARIO")).toBe(builder)
            expect(builder.comPeriodo(null, null)).toBe(builder)
        })

        test("permite sobrescrever filtros existentes", () => {
            const builder = new UsuarioFilterBuilder()
            const resultado = builder
                .comNome("Maria")
                .comNome("João")
                .comEmail("antigo@email.com")
                .comEmail("novo@email.com")
                .comCpf("111")
                .comCpf("222")
                .comCidade("Vilhena")
                .comCidade("Porto Velho")
                .comUf("RO")
                .comUf("SP")
                .comSituacao("ATIVO")
                .comSituacao("SUSPENSO")
                .comPerfil("USUARIO")
                .comPerfil("ADMINISTRADOR")
                .build()

            expect(resultado).toEqual({
                nome: { $regex: "João", $options: "i" },
                email: { $regex: "novo@email\\.com", $options: "i" },
                cpf: { $regex: "222", $options: "i" },
                cidade: { $regex: "Porto Velho", $options: "i" },
                uf: "SP",
                situacao: "SUSPENSO",
                perfil: "ADMINISTRADOR"
            })
        })

        test("valores vazios não removem filtros existentes", () => {
            const builder = new UsuarioFilterBuilder()
            const resultado = builder
                .comNome("Maria")
                .comEmail("maria@email.com")
                .comCpf("123")
                .comCidade("Vilhena")
                .comUf("RO")
                .comSituacao("ATIVO")
                .comPerfil("USUARIO")
                .comNome(null)
                .comEmail(undefined)
                .comCpf("")
                .comCidade(false)
                .comUf(null)
                .comSituacao(undefined)
                .comPerfil("")
                .build()

            expect(resultado).toEqual({
                nome: { $regex: "Maria", $options: "i" },
                email: { $regex: "maria@email\\.com", $options: "i" },
                cpf: { $regex: "123", $options: "i" },
                cidade: { $regex: "Vilhena", $options: "i" },
                uf: "RO",
                situacao: "ATIVO",
                perfil: "USUARIO"
            })
        })
    })

    describe("comPeriodo", () => {

        test("não adiciona período quando ambas as datas estão ausentes", () => {
            const builder = new UsuarioFilterBuilder()

            expect(builder.comPeriodo(null, null).build()).toEqual({})
        })

        test("adiciona somente a data inicial", () => {
            const builder = new UsuarioFilterBuilder()
            const inicio = "2026-01-01T00:00:00"
            const resultado = builder.comPeriodo(inicio, null).build()

            expect(resultado).toEqual({ data_cadastro: { $gte: new Date(inicio) } })
            expect(resultado.data_cadastro.$lte).toBeUndefined()
        })

        test("adiciona somente a data final até o fim do dia", () => {
            const builder = new UsuarioFilterBuilder()
            const fim = "2026-01-31T00:00:00"
            const fimEsperado = new Date(fim)

            fimEsperado.setHours(23, 59, 59, 999)

            const resultado = builder.comPeriodo(null, fim).build()

            expect(resultado).toEqual({ data_cadastro: { $lte: fimEsperado } })
            expect(resultado.data_cadastro.$gte).toBeUndefined()
            expect(resultado.data_cadastro.$lte.getHours()).toBe(23)
            expect(resultado.data_cadastro.$lte.getMinutes()).toBe(59)
            expect(resultado.data_cadastro.$lte.getSeconds()).toBe(59)
            expect(resultado.data_cadastro.$lte.getMilliseconds()).toBe(999)
        })

        test("adiciona período completo", () => {
            const builder = new UsuarioFilterBuilder()
            const inicio = "2026-01-01T00:00:00"
            const fim = "2026-01-31T00:00:00"
            const fimEsperado = new Date(fim)

            fimEsperado.setHours(23, 59, 59, 999)

            const resultado = builder.comPeriodo(inicio, fim).build()

            expect(resultado).toEqual({
                data_cadastro: {
                    $gte: new Date(inicio),
                    $lte: fimEsperado
                }
            })
        })

        test("combina período com os demais filtros", () => {
            const builder = new UsuarioFilterBuilder()
            const inicio = "2026-05-01T00:00:00"
            const fim = "2026-05-31T00:00:00"
            const fimEsperado = new Date(fim)

            fimEsperado.setHours(23, 59, 59, 999)

            const resultado = builder
                .comNome("Maria")
                .comSituacao("ATIVO")
                .comPeriodo(inicio, fim)
                .build()

            expect(resultado).toEqual({
                nome: { $regex: "Maria", $options: "i" },
                situacao: "ATIVO",
                data_cadastro: { $gte: new Date(inicio), $lte: fimEsperado }
            })
        })

        test("substitui um período existente", () => {
            const builder = new UsuarioFilterBuilder()
            const resultado = builder
                .comPeriodo("2026-01-01", "2026-01-31")
                .comPeriodo("2026-06-01", null)
                .build()

            expect(resultado).toEqual({ data_cadastro: { $gte: new Date("2026-06-01") } })
        })

        test("mantém período anterior quando recebe datas vazias", () => {
            const builder = new UsuarioFilterBuilder()
            const resultado = builder
                .comPeriodo("2026-01-01", null)
                .comPeriodo(null, null)
                .build()

            expect(resultado).toEqual({ data_cadastro: { $gte: new Date("2026-01-01") } })
        })
    })

    test("build retorna a referência dos filtros internos", () => {
        const builder = new UsuarioFilterBuilder()

        expect(builder.build()).toBe(builder.filtros)
    })
})
