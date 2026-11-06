import { describe, expect, test } from "@jest/globals";
import InteresseFilterBuilder from "../../../repositories/filters/InteresseFilterBuilder.js";

describe("InteresseFilterBuilder", () => {

    test("inicializa com filtros vazios", () => {
        const builder = new InteresseFilterBuilder()

        expect(builder.build()).toEqual({})
    })

    test.each([
        ["comItem", "item_id"],
        ["comUsuarioInteressado", "usuario_interessado_id"],
        ["comUsuarioDoador", "usuario_doador_id"],
        ["comStatus", "status"]
    ])(
        "%s adiciona corretamente o filtro %s",
        (metodo, campo) => {
            const builder = new InteresseFilterBuilder()
            const resultado = builder[metodo]("valor").build()

            expect(resultado).toEqual({ [campo]: "valor" })
        }
    )

    test.each([null, undefined, "", false, 0])("ignora valores vazios em todos os filtros: %s", (valor) => {
        const builder = new InteresseFilterBuilder()
        const resultado = builder
            .comItem(valor)
            .comUsuarioInteressado(valor)
            .comUsuarioDoador(valor)
            .comStatus(valor)
            .build()

        expect(resultado).toEqual({})
    })

    test("permite encadear todos os métodos", () => {
        const builder = new InteresseFilterBuilder()

        expect(builder.comItem("item-1")).toBe(builder)
        expect(builder.comUsuarioInteressado("usuario-1")).toBe(builder)
        expect(builder.comUsuarioDoador("usuario-2")).toBe(builder)
        expect(builder.comStatus("PENDENTE")).toBe(builder)
        expect(builder.comPeriodo(null, null)).toBe(builder)
    })

    test("permite sobrescrever filtros existentes", () => {
        const builder = new InteresseFilterBuilder()
        const resultado = builder
            .comItem("item-antigo")
            .comItem("item-novo")
            .comUsuarioInteressado("interessado-antigo")
            .comUsuarioInteressado("interessado-novo")
            .comUsuarioDoador("doador-antigo")
            .comUsuarioDoador("doador-novo")
            .comStatus("PENDENTE")
            .comStatus("ACEITO")
            .build()

        expect(resultado).toEqual({
            item_id: "item-novo",
            usuario_interessado_id: "interessado-novo",
            usuario_doador_id: "doador-novo",
            status: "ACEITO",
        })
    })

    test("valores vazios não removem filtros existentes", () => {
        const builder = new InteresseFilterBuilder()
        const resultado = builder
            .comItem("item-1")
            .comUsuarioInteressado("usuario-1")
            .comUsuarioDoador("usuario-2")
            .comStatus("ACEITO")
            .comItem(null)
            .comUsuarioInteressado(undefined)
            .comUsuarioDoador("")
            .comStatus(false)
            .build()

        expect(resultado).toEqual({
            item_id: "item-1",
            usuario_interessado_id: "usuario-1",
            usuario_doador_id: "usuario-2",
            status: "ACEITO",
        })
    })

    // Testes específicos do filtro por período
    test("não adiciona período quando ambas as datas estão ausentes", () => {
        const builder = new InteresseFilterBuilder()
        const resultado = builder.comPeriodo(null, null).build()

        expect(resultado).toEqual({})
    })

    test("adiciona somente a data inicial", () => {
        const builder = new InteresseFilterBuilder()
        const inicio = "2026-01-01T00:00:00"
        const resultado = builder.comPeriodo(inicio, null).build()

        expect(resultado).toEqual({ data_interesse: { $gte: new Date(inicio) } })

        expect(resultado.data_interesse.$lte).toBeUndefined()
    })

    test("adiciona somente a data final até o fim do dia", () => {
        const builder = new InteresseFilterBuilder()
        const dataFim = "2026-01-31T00:00:00"
        const fimEsperado = new Date(dataFim)

        fimEsperado.setHours(23, 59, 59, 999)

        const resultado = builder.comPeriodo(null, dataFim).build()

        expect(resultado).toEqual({ data_interesse: { $lte: fimEsperado } })

        expect(resultado.data_interesse.$gte).toBeUndefined()
        expect(resultado.data_interesse.$lte.getHours()).toBe(23)
        expect(resultado.data_interesse.$lte.getMinutes()).toBe(59)
        expect(resultado.data_interesse.$lte.getSeconds()).toBe(59)
        expect(resultado.data_interesse.$lte.getMilliseconds()).toBe(999)
    })

    test("adiciona período completo", () => {
        const builder = new InteresseFilterBuilder()
        const inicio = "2026-01-01T00:00:00"
        const fim = "2026-01-31T00:00:00"
        const fimEsperado = new Date(fim)

        fimEsperado.setHours(23, 59, 59, 999)

        const resultado = builder.comPeriodo(inicio, fim).build()

        expect(resultado).toEqual({ data_interesse: { $gte: new Date(inicio), $lte: fimEsperado } })
    })

    test("combina período com os demais filtros", () => {
        const builder = new InteresseFilterBuilder()
        const inicio = "2026-05-01T00:00:00"
        const fim = "2026-05-31T00:00:00"
        const fimEsperado = new Date(fim)

        fimEsperado.setHours(23, 59, 59, 999)

        const resultado = builder
            .comItem("item-1")
            .comUsuarioInteressado("usuario-1")
            .comStatus("ACEITO")
            .comPeriodo(inicio, fim)
            .build()

        expect(resultado).toEqual({
            item_id: "item-1",
            usuario_interessado_id: "usuario-1",
            status: "ACEITO",
            data_interesse: {
                $gte: new Date(inicio),
                $lte: fimEsperado
            }
        })
    })

    test("substitui um período existente", () => {
        const builder = new InteresseFilterBuilder()

        const resultado = builder
            .comPeriodo("2026-01-01", "2026-01-31")
            .comPeriodo("2026-06-01", null)
            .build()

        expect(resultado).toEqual({ data_interesse: { $gte: new Date("2026-06-01") } })
    })

    test("mantém o período anterior quando recebe datas vazias", () => {
        const builder = new InteresseFilterBuilder()
        const resultado = builder.comPeriodo("2026-01-01", null).comPeriodo(null, null).build()

        expect(resultado).toEqual({ data_interesse: { $gte: new Date("2026-01-01") } })
    })

    test("build retorna a referência dos filtros internos", () => {
        const builder = new InteresseFilterBuilder()

        expect(builder.build()).toBe(builder.filtros)
    })
})