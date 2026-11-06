
import { describe, expect, test } from "@jest/globals";
import DenunciaFilterBuilder from "../../../repositories/filters/DenunciaFilterBuilder.js";

describe("DenunciaFilterBuilder", () => {

    test("inicializa com filtros vazios", () => {
        const builder = new DenunciaFilterBuilder()

        expect(builder.build()).toEqual({})
    })

    test.each([
        ["comDenunciante", "denunciante_id"],
        ["comTipoAlvo", "tipo_alvo"],
        ["comAlvoItem", "alvo_item_id"],
        ["comAlvoUsuario", "alvo_usuario_id"],
        ["comMotivo", "motivo"],
        ["comStatus", "status"],
        ["comAdmin", "admin_id"]
    ])(
        "%s adiciona corretamente o filtro %s",
        (metodo, campo) => {
            const builder = new DenunciaFilterBuilder()
            const resultado = builder[metodo]("valor").build()

            expect(resultado).toEqual({ [campo]: "valor" })
        }
    )

    test.each([null, undefined, "", false, 0])("ignora valores vazios em todos os filtros: %s", (valor) => {
        const builder = new DenunciaFilterBuilder()

        const resultado = builder
            .comDenunciante(valor)
            .comTipoAlvo(valor)
            .comAlvoItem(valor)
            .comAlvoUsuario(valor)
            .comMotivo(valor)
            .comStatus(valor)
            .comAdmin(valor)
            .build()

        expect(resultado).toEqual({})
    }
    )

    test("permite encadear todos os métodos", () => {
        const builder = new DenunciaFilterBuilder()

        expect(builder.comDenunciante("usuario-1")).toBe(builder)
        expect(builder.comTipoAlvo("ITEM")).toBe(builder)
        expect(builder.comAlvoItem("item-1")).toBe(builder)
        expect(builder.comAlvoUsuario("usuario-2")).toBe(builder)
        expect(builder.comMotivo("MOTIVO")).toBe(builder)
        expect(builder.comStatus("EM_ANALISE")).toBe(builder)
        expect(builder.comAdmin("admin-1")).toBe(builder)
        expect(builder.comPeriodo(null, null)).toBe(builder)
    })

    test("permite sobrescrever filtros existentes", () => {
        const builder = new DenunciaFilterBuilder()
        const resultado = builder
            .comDenunciante("usuario-antigo")
            .comDenunciante("usuario-novo")
            .comTipoAlvo("ITEM")
            .comTipoAlvo("USUARIO")
            .comAlvoItem("item-antigo")
            .comAlvoItem("item-novo")
            .comAlvoUsuario("usuario-antigo")
            .comAlvoUsuario("usuario-novo")
            .comMotivo("MOTIVO_ANTIGO")
            .comMotivo("MOTIVO_NOVO")
            .comStatus("EM_ANALISE")
            .comStatus("RESOLVIDA")
            .comAdmin("admin-antigo")
            .comAdmin("admin-novo")
            .build()

        expect(resultado).toEqual({
            denunciante_id: "usuario-novo",
            tipo_alvo: "USUARIO",
            alvo_item_id: "item-novo",
            alvo_usuario_id: "usuario-novo",
            motivo: "MOTIVO_NOVO",
            status: "RESOLVIDA",
            admin_id: "admin-novo",
        })
    })

    test("valores vazios não removem filtros existentes", () => {
        const builder = new DenunciaFilterBuilder()
        const resultado = builder
            .comDenunciante("usuario-1")
            .comTipoAlvo("ITEM")
            .comAlvoItem("item-1")
            .comAlvoUsuario("usuario-2")
            .comMotivo("MOTIVO")
            .comStatus("EM_ANALISE")
            .comAdmin("admin-1")
            .comDenunciante(null)
            .comTipoAlvo(undefined)
            .comAlvoItem("")
            .comAlvoUsuario(false)
            .comMotivo(0)
            .comStatus(null)
            .comAdmin(undefined)
            .build()

        expect(resultado).toEqual({
            denunciante_id: "usuario-1",
            tipo_alvo: "ITEM",
            alvo_item_id: "item-1",
            alvo_usuario_id: "usuario-2",
            motivo: "MOTIVO",
            status: "EM_ANALISE",
            admin_id: "admin-1",
        })
    })

    // Testes do filtro por período
    test("não adiciona período quando ambas as datas estão ausentes", () => {
        const builder = new DenunciaFilterBuilder()

        expect(builder.comPeriodo(null, null).build()).toEqual({})
    })

    test("adiciona somente a data inicial", () => {
        const builder = new DenunciaFilterBuilder()
        const inicio = "2026-01-01T00:00:00"
        const resultado = builder.comPeriodo(inicio, null).build()

        expect(resultado).toEqual({ data_denuncia: { $gte: new Date(inicio) } })

        expect(resultado.data_denuncia.$lte).toBeUndefined()
    })

    test("adiciona somente a data final até o fim do dia", () => {
        const builder = new DenunciaFilterBuilder()
        const dataFim = "2026-01-31T00:00:00"
        const fimEsperado = new Date(dataFim)

        fimEsperado.setHours(23, 59, 59, 999)

        const resultado = builder.comPeriodo(null, dataFim).build()

        expect(resultado).toEqual({ data_denuncia: { $lte: fimEsperado } })

        expect(resultado.data_denuncia.$gte).toBeUndefined()
        expect(resultado.data_denuncia.$lte.getHours()).toBe(23)
        expect(resultado.data_denuncia.$lte.getMinutes()).toBe(59)
        expect(resultado.data_denuncia.$lte.getSeconds()).toBe(59)
        expect(resultado.data_denuncia.$lte.getMilliseconds()).toBe(999)
    })

    test("adiciona período completo", () => {
        const builder = new DenunciaFilterBuilder()
        const inicio = "2026-01-01T00:00:00"
        const fim = "2026-01-31T00:00:00"
        const fimEsperado = new Date(fim)

        fimEsperado.setHours(23, 59, 59, 999)

        const resultado = builder.comPeriodo(inicio, fim).build()

        expect(resultado).toEqual({
            data_denuncia: {
                $gte: new Date(inicio),
                $lte: fimEsperado
            }
        })
    })

    test("combina período com os demais filtros", () => {
        const builder = new DenunciaFilterBuilder()
        const inicio = "2026-05-01T00:00:00"
        const fim = "2026-05-31T00:00:00"
        const fimEsperado = new Date(fim)

        fimEsperado.setHours(23, 59, 59, 999)

        const resultado = builder
            .comDenunciante("usuario-1")
            .comStatus("EM_ANALISE")
            .comPeriodo(inicio, fim)
            .build()

        expect(resultado).toEqual({
            denunciante_id: "usuario-1",
            status: "EM_ANALISE",
            data_denuncia: {
                $gte: new Date(inicio),
                $lte: fimEsperado
            }
        })
    })

    test("substitui um período existente", () => {
        const builder = new DenunciaFilterBuilder()
        const resultado = builder
            .comPeriodo("2026-01-01", "2026-01-31")
            .comPeriodo("2026-06-01", null)
            .build()

        expect(resultado).toEqual({ data_denuncia: { $gte: new Date("2026-06-01") } })
    })

    test("mantém o período anterior quando recebe datas vazias", () => {
        const builder = new DenunciaFilterBuilder()
        const resultado = builder
            .comPeriodo("2026-01-01", null)
            .comPeriodo(null, null)
            .build()

        expect(resultado).toEqual({ data_denuncia: { $gte: new Date("2026-01-01") } })
    })

    test("build retorna a referência dos filtros internos", () => {
        const builder = new DenunciaFilterBuilder()

        expect(builder.build()).toBe(builder.filtros)
    })

})
