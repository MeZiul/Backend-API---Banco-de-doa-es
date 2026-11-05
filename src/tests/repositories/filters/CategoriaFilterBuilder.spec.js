
import { describe, expect, test } from "@jest/globals";
import CategoriaFilterBuilder from "../../../repositories/filters/CategoriaFilterBuilder.js";

describe("CategoriaFilterBuilder", () => {

    test("inicializa com filtros vazios", () => {
        const builder = new CategoriaFilterBuilder()

        expect(builder.build()).toEqual({})
    })

    test("adiciona filtro por nome", () => {
        const builder = new CategoriaFilterBuilder()
        const resultado = builder.comNome("Alimentos").build()

        expect(resultado).toEqual({ nome: { $regex: "Alimentos", $options: "i" } })
    })

    test.each(["", null, undefined, false])("não adiciona filtro para nome inválido: %s",
        (nome) => {
            const builder = new CategoriaFilterBuilder()

            expect(builder.comNome(nome).build()).toEqual({})
        }
    )

    test.each([
        ["true", true, { ativo: true }],
        ["false", false, { ativo: false }],
    ])("adiciona filtro ativo com valor %s", (_, ativo, esperado) => {
        const builder = new CategoriaFilterBuilder()

        expect(builder.comAtivo(ativo).build()).toEqual(esperado)
    })

    test.each(["invalido", "", null, undefined, 1, 0])("ignora valor inválido para ativo: %s",
        (ativo) => {
            const builder = new CategoriaFilterBuilder()

            expect(builder.comAtivo(ativo).build()).toEqual({})
        }
    )

    test("combina filtros por nome e situação ativa", () => {
        const builder = new CategoriaFilterBuilder()
        const resultado = builder
            .comNome("Roupas")
            .comAtivo(true)
            .build()

        expect(resultado).toEqual({
            nome: {
                $regex: "Roupas",
                $options: "i"
            },
            ativo: true
        })
    })

    test("permite encadear os métodos", () => {
        const builder = new CategoriaFilterBuilder()

        expect(builder.comNome("Livros")).toBe(builder)
        expect(builder.comAtivo(false)).toBe(builder)
    })

    test("permite sobrescrever filtros existentes", () => {
        const builder = new CategoriaFilterBuilder()
        const resultado = builder
            .comNome("Alimentos")
            .comNome("Livros")
            .comAtivo(true)
            .comAtivo(false)
            .build()

        expect(resultado).toEqual({
            nome: {
                $regex: "Livros",
                $options: "i"
            },
            ativo: false
        })
    })

    test("retorna a mesma referência dos filtros internos", () => {
        const builder = new CategoriaFilterBuilder()

        expect(builder.build()).toBe(builder.filtros)
    })
})
