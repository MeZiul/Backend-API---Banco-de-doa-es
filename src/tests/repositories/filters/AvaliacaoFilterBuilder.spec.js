import { describe, expect, test } from "@jest/globals";
import AvaliacaoFilterBuilder from "../../../repositories/filters/AvaliacaoFilterBuilder.js";

describe("AvaliacaoFilterBuilder", () => {

    test("inicializa com filtros vazios", () => {
        const builder = new AvaliacaoFilterBuilder()

        expect(builder.build()).toEqual({})
    })

    test.each([
        ["comAvaliador", "avaliador_id"],
        ["comAvaliado", "avaliado_id"],
        ["comItem", "item_id"],
        ["comTipo", "tipo"]
    ])
        ("%s adiciona corretamente o campo %s",
            (metodo, campo) => {
                const builder = new AvaliacaoFilterBuilder()
                const resultado = builder[metodo]("valor").build()

                expect(resultado).toEqual({ [campo]: "valor" })
            }
        )

    test.each([null, undefined, "", false, 0])("ignora valores vazios em todos os filtros: %s", (valor) => {
        const builder = new AvaliacaoFilterBuilder()

        const resultado = builder
            .comAvaliador(valor)
            .comAvaliado(valor)
            .comItem(valor)
            .comTipo(valor)
            .build()

        expect(resultado).toEqual({})
    })

    test("combina todos os filtros", () => {
        const builder = new AvaliacaoFilterBuilder()

        const resultado = builder
            .comAvaliador("usuario-1")
            .comAvaliado("usuario-2")
            .comItem("item-1")
            .comTipo("DOADOR")
            .build()

        expect(resultado).toEqual({
            avaliador_id: "usuario-1",
            avaliado_id: "usuario-2",
            item_id: "item-1",
            tipo: "DOADOR"
        })
    })

    test("permite encadear todos os métodos", () => {
        const builder = new AvaliacaoFilterBuilder()

        expect(builder.comAvaliador("usuario-1")).toBe(builder)
        expect(builder.comAvaliado("usuario-2")).toBe(builder)
        expect(builder.comItem("item-1")).toBe(builder)
        expect(builder.comTipo("DOADOR")).toBe(builder)
    })

    test("permite sobrescrever filtros existentes", () => {
        const builder = new AvaliacaoFilterBuilder()

        const resultado = builder
            .comAvaliador("usuario-antigo")
            .comAvaliador("usuario-novo")
            .comAvaliado("avaliado-antigo")
            .comAvaliado("avaliado-novo")
            .comItem("item-antigo")
            .comItem("item-novo")
            .comTipo("DOADOR")
            .comTipo("RECEBEDOR")
            .build()

        expect(resultado).toEqual({
            avaliador_id: "usuario-novo",
            avaliado_id: "avaliado-novo",
            item_id: "item-novo",
            tipo: "RECEBEDOR"
        })
    })

    test("não remove filtros existentes ao receber valores vazios", () => {
        const builder = new AvaliacaoFilterBuilder()

        const resultado = builder
            .comAvaliador("usuario-1")
            .comAvaliado("usuario-2")
            .comItem("item-1")
            .comTipo("DOADOR")
            .comAvaliador(null)
            .comAvaliado(undefined)
            .comItem("")
            .comTipo(false)
            .build()

        expect(resultado).toEqual({
            avaliador_id: "usuario-1",
            avaliado_id: "usuario-2",
            item_id: "item-1",
            tipo: "DOADOR"
        })
    })

    test("build retorna a referência dos filtros internos", () => {
        const builder = new AvaliacaoFilterBuilder()

        expect(builder.build()).toBe(builder.filtros)
    })

})