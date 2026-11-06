import { describe, expect, test } from "@jest/globals";
import ItemDoacaoFilterBuilder from "../../../repositories/filters/ItemDoacaoFilterBuilder.js";

describe("ItemDoacaoFilterBuilder", () => {

    test("inicializa com filtros vazios", () => {
        const builder = new ItemDoacaoFilterBuilder()

        expect(builder.build()).toEqual({})
    })

    describe("comStatus", () => {
        test("utiliza DISPONIVEL como status padrão", () => {
            const builder = new ItemDoacaoFilterBuilder()

            expect(builder.comStatus().build()).toEqual({ status: "DISPONIVEL" })
        })

        test("aceita status personalizado", () => {
            const builder = new ItemDoacaoFilterBuilder()

            expect(builder.comStatus("DOADO").build()).toEqual({ status: "DOADO" })
        })

        test.each([null, "", false, 0])("ignora status vazio: %s", (status) => {
            const builder = new ItemDoacaoFilterBuilder()

            expect(builder.comStatus(status).build()).toEqual({})
        })

        test("sobrescreve status existente", () => {
            const builder = new ItemDoacaoFilterBuilder()

            expect(builder.comStatus("DISPONIVEL").comStatus("DOADO").build()
            ).toEqual({ status: "DOADO" })
        })
    })

    describe("comBuscaTextual", () => {
        test("pesquisa em título e descrição sem diferenciar maiúsculas", () => {
            const builder = new ItemDoacaoFilterBuilder()

            const resultado = builder.comBuscaTextual("Livro").build()

            expect(resultado.$or).toHaveLength(2)
            expect(resultado.$or[0].titulo).toEqual(/Livro/i)
            expect(resultado.$or[1].descricao).toEqual(/Livro/i)
            expect(resultado.$or[0].titulo.test("LIVRO")).toBe(true)
            expect(resultado.$or[1].descricao.test("livro")).toBe(true)
        })

        test("escapa caracteres especiais de expressões regulares", () => {
            const builder = new ItemDoacaoFilterBuilder()
            const texto = "Livro.*+?^${}()|[]\\"
            const resultado = builder.comBuscaTextual(texto).build()
            const regexTitulo = resultado.$or[0].titulo
            const regexDescricao = resultado.$or[1].descricao

            expect(regexTitulo.test(texto)).toBe(true)
            expect(regexDescricao.test(texto)).toBe(true)
            expect(regexTitulo.test("Livro qualquer coisa")).toBe(false)
            expect(regexTitulo.flags).toContain("i")
        })

        test.each([null, undefined, "", false])("ignora busca textual vazia: %s", (texto) => {
            const builder = new ItemDoacaoFilterBuilder()

            expect(builder.comBuscaTextual(texto).build()).toEqual({})
        }
        )
    })

    describe("filtros simples", () => {
        test.each([
            ["comCategoria", "categoria_id", "categoria-1"],
            ["comCondicao", "condicao_item", "NOVO"],
            ["comUsuario", "usuario_id", "usuario-1"],
        ])(
            "%s adiciona o campo %s",
            (metodo, campo, valor) => {
                const builder = new ItemDoacaoFilterBuilder()

                expect(builder[metodo](valor).build()).toEqual({ [campo]: valor })
            }
        )

        test.each([null, undefined, "", false, 0])("ignora valores vazios dos filtros simples: %s", (valor) => {
            const builder = new ItemDoacaoFilterBuilder()

            expect(builder.comCategoria(valor).comCondicao(valor).comUsuario(valor).build()
            ).toEqual({})
        }
        )

    })

    describe("comCidade", () => {
        test("cria filtro de cidade ignorando maiúsculas", () => {
            const builder = new ItemDoacaoFilterBuilder()
            const resultado = builder.comCidade("Vilhena").build()

            expect(resultado.cidade).toEqual(/Vilhena/i)
            expect(resultado.cidade.test("VILHENA")).toBe(true)
        })

        test("escapa caracteres especiais no nome da cidade", () => {
            const builder = new ItemDoacaoFilterBuilder()
            const resultado = builder.comCidade("São Paulo (SP)").build()

            expect(resultado.cidade.test("São Paulo (SP)")).toBe(true)
            expect(resultado.cidade.test("São Paulo SP")).toBe(false)
        })

        test.each([null, undefined, "", false])("ignora cidade vazia: %s", (cidade) => {
            const builder = new ItemDoacaoFilterBuilder()

            expect(builder.comCidade(cidade).build()).toEqual({})
        })
    })

    describe("comUf", () => {
        test("converte UF para maiúsculas", () => {
            const builder = new ItemDoacaoFilterBuilder()

            expect(builder.comUf("ro").build()).toEqual({ uf: "RO" })
        })

        test("mantém UF já em maiúsculas", () => {
            const builder = new ItemDoacaoFilterBuilder()

            expect(builder.comUf("SP").build()).toEqual({ uf: "SP" })
        })

        test.each([null, undefined, "", false])("ignora UF vazia: %s", (uf) => {
            const builder = new ItemDoacaoFilterBuilder()

            expect(builder.comUf(uf).build()).toEqual({})
        }
        )
    })

    describe("comPeriodo", () => {
        test("não adiciona período sem datas", () => {
            const builder = new ItemDoacaoFilterBuilder()

            expect(builder.comPeriodo(null, null).build()).toEqual({})
        })

        test("adiciona somente data inicial", () => {
            const builder = new ItemDoacaoFilterBuilder()
            const inicio = "2026-01-01T00:00:00"
            const resultado = builder.comPeriodo(inicio, null).build()

            expect(resultado).toEqual({ data_cadastro: { $gte: new Date(inicio) } })
        })

        test("adiciona somente data final até o fim do dia", () => {
            const builder = new ItemDoacaoFilterBuilder()
            const dataFim = "2026-01-31T00:00:00"
            const fimEsperado = new Date(dataFim)

            fimEsperado.setHours(23, 59, 59, 999)

            const resultado = builder.comPeriodo(null, dataFim).build()

            expect(resultado).toEqual({ data_cadastro: { $lte: fimEsperado } })
            expect(resultado.data_cadastro.$lte.getHours()).toBe(23)
            expect(resultado.data_cadastro.$lte.getMinutes()).toBe(59)
            expect(resultado.data_cadastro.$lte.getSeconds()).toBe(59)
            expect(resultado.data_cadastro.$lte.getMilliseconds()).toBe(999)
        })

        test("adiciona período completo", () => {
            const builder = new ItemDoacaoFilterBuilder()
            const inicio = "2026-01-01T00:00:00"
            const fim = "2026-01-31T00:00:00"
            const fimEsperado = new Date(fim)

            fimEsperado.setHours(23, 59, 59, 999)

            const resultado = builder.comPeriodo(inicio, fim).build()

            expect(resultado).toEqual({ data_cadastro: { $gte: new Date(inicio), $lte: fimEsperado } })
        })

        test("substitui período existente", () => {
            const builder = new ItemDoacaoFilterBuilder()

            const resultado = builder.comPeriodo("2026-01-01", "2026-01-31").comPeriodo("2026-06-01", null).build()

            expect(resultado).toEqual({ data_cadastro: { $gte: new Date("2026-06-01") } })
        })

        test("mantém período anterior se novas datas forem vazias", () => {
            const builder = new ItemDoacaoFilterBuilder()

            const resultado = builder.comPeriodo("2026-01-01", null).comPeriodo(null, null).build()

            expect(resultado).toEqual({ data_cadastro: { $gte: new Date("2026-01-01") } })
        })
    })

    describe("construirOrdenacao", () => {
        test.each([
            ["antigos", { data_cadastro: 1 }],
            ["visualizados", { visualizacoes: -1 }],
            ["interessados", { total_interesses: -1 }],
            ["recentes", { data_cadastro: -1 }],
            ["invalido", { data_cadastro: -1 }],
            [undefined, { data_cadastro: -1 }],
        ])(
            "retorna ordenação correta para %s",
            (tipo, esperado) => {
                expect(ItemDoacaoFilterBuilder.construirOrdenacao(tipo)).toEqual(esperado)
            }
        )
    })

    test("permite encadear os métodos", () => {
        const builder = new ItemDoacaoFilterBuilder()

        expect(builder.comStatus()).toBe(builder)
        expect(builder.comBuscaTextual("livro")).toBe(builder)
        expect(builder.comCategoria("categoria-1")).toBe(builder)
        expect(builder.comCidade("Vilhena")).toBe(builder)
        expect(builder.comCondicao("USADO")).toBe(builder)
        expect(builder.comUf("ro")).toBe(builder)
        expect(builder.comUsuario("usuario-1")).toBe(builder)
        expect(builder.comPeriodo(null, null)).toBe(builder)
    })

    test("combina todos os filtros", () => {
        const builder = new ItemDoacaoFilterBuilder()
        const inicio = "2026-01-01T00:00:00"
        const resultado = builder
            .comStatus("DISPONIVEL")
            .comBuscaTextual("Mesa")
            .comCategoria("categoria-1")
            .comCidade("Vilhena")
            .comCondicao("USADO")
            .comUf("ro")
            .comUsuario("usuario-1")
            .comPeriodo(inicio, null)
            .build()

        expect(resultado).toEqual({
            status: "DISPONIVEL",
            $or: [
                { titulo: /Mesa/i },
                { descricao: /Mesa/i }
            ],
            categoria_id: "categoria-1",
            cidade: /Vilhena/i,
            condicao_item: "USADO",
            uf: "RO",
            usuario_id: "usuario-1",
            data_cadastro: {
                $gte: new Date(inicio)
            }
        })
    })

    test("build retorna a referência dos filtros internos", () => {
        const builder = new ItemDoacaoFilterBuilder()

        expect(builder.build()).toBe(builder.query)
    })

})
