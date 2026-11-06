
import { describe, expect, test } from "@jest/globals";
import AdministracaoFilterBuilder from "../../../repositories/filters/AdministracaoFilterBuilder.js";

describe("AdministracaoFilterBuilder", () => {

    test("inicializa com filtros vazios", () => {
        const builder = new AdministracaoFilterBuilder()

        expect(builder.build()).toEqual({})
    })

    test.each([
        ["comAdministrador", "administrador_id"],
        ["comTipoAcao", "tipo_acao"],
        ["comTipoAlvo", "tipo_alvo"],
        ["comAlvo", "alvo_id"],
        ["comResultadoDenuncia", "resultado_denuncia"]
    ])(
        "%s adiciona corretamente o campo %s",
        (metodo, campo) => {
            const builder = new AdministracaoFilterBuilder()
            const resultado = builder[metodo]("valor").build()

            expect(resultado).toEqual({ [campo]: "valor" })
        }
    )

    test.each([null, undefined, "", false, 0])("ignora valores vazios nos filtros: %s", (valor) => {
        const builder = new AdministracaoFilterBuilder()

        const resultado = builder
            .comAdministrador(valor)
            .comTipoAcao(valor)
            .comTipoAlvo(valor)
            .comAlvo(valor)
            .comResultadoDenuncia(valor)
            .build()

        expect(resultado).toEqual({})
    })

    test("combina todos os filtros administrativos", () => {
        const builder = new AdministracaoFilterBuilder()
        const resultado = builder
            .comAdministrador("admin-1")
            .comTipoAcao("BLOQUEIO_USUARIO")
            .comTipoAlvo("USUARIO")
            .comAlvo("usuario-1")
            .comResultadoDenuncia("RESOLVIDA")
            .build()

        expect(resultado).toEqual({
            administrador_id: "admin-1",
            tipo_acao: "BLOQUEIO_USUARIO",
            tipo_alvo: "USUARIO",
            alvo_id: "usuario-1",
            resultado_denuncia: "RESOLVIDA"
        })
    })

    test("permite encadear os métodos", () => {
        const builder = new AdministracaoFilterBuilder()

        expect(builder.comAdministrador("admin-1")).toBe(builder)
        expect(builder.comTipoAcao("BLOQUEIO_USUARIO")).toBe(builder)
        expect(builder.comTipoAlvo("USUARIO")).toBe(builder)
        expect(builder.comAlvo("usuario-1")).toBe(builder)
        expect(builder.comResultadoDenuncia("RESOLVIDA")).toBe(builder)
        expect(builder.comPeriodo(null, null)).toBe(builder)
    })

    test("permite sobrescrever filtros existentes", () => {
        const builder = new AdministracaoFilterBuilder()
        const resultado = builder
            .comAdministrador("admin-antigo")
            .comAdministrador("admin-novo")
            .comTipoAcao("BLOQUEIO_USUARIO")
            .comTipoAcao("DESBLOQUEIO_USUARIO")
            .comTipoAlvo("ITEM")
            .comTipoAlvo("USUARIO")
            .comAlvo("item-1")
            .comAlvo("usuario-1")
            .comResultadoDenuncia("REJEITADA")
            .comResultadoDenuncia("RESOLVIDA")
            .build()

        expect(resultado).toEqual({
            administrador_id: "admin-novo",
            tipo_acao: "DESBLOQUEIO_USUARIO",
            tipo_alvo: "USUARIO",
            alvo_id: "usuario-1",
            resultado_denuncia: "RESOLVIDA"
        })
    })

    test("não remove filtros existentes ao receber valores vazios", () => {
        const builder = new AdministracaoFilterBuilder()
        const resultado = builder
            .comAdministrador("admin-1")
            .comTipoAcao("BLOQUEIO_USUARIO")
            .comTipoAlvo("USUARIO")
            .comAlvo("usuario-1")
            .comResultadoDenuncia("RESOLVIDA")
            .comAdministrador(null)
            .comTipoAcao(undefined)
            .comTipoAlvo("")
            .comAlvo(false)
            .comResultadoDenuncia(null)
            .build()

        expect(resultado).toEqual({
            administrador_id: "admin-1",
            tipo_acao: "BLOQUEIO_USUARIO",
            tipo_alvo: "USUARIO",
            alvo_id: "usuario-1",
            resultado_denuncia: "RESOLVIDA"
        })
    })

    // Testes específicos do filtro por período
    test("não adiciona período quando ambas as datas estão ausentes", () => {
        const builder = new AdministracaoFilterBuilder()
        const resultado = builder.comPeriodo(null, null).build()

        expect(resultado).toEqual({})
    })

    test("adiciona somente a data inicial", () => {
        const builder = new AdministracaoFilterBuilder()
        const dataInicio = "2026-01-01T00:00:00"
        const resultado = builder.comPeriodo(dataInicio, null).build()

        expect(resultado).toEqual({ data_acao: { $gte: new Date(dataInicio) } })

        expect(resultado.data_acao.$lte).toBeUndefined()
    })

    test("adiciona somente a data final até o fim do dia", () => {
        const builder = new AdministracaoFilterBuilder()
        const dataFim = "2026-01-31T00:00:00"
        const fimEsperado = new Date(dataFim)

        fimEsperado.setHours(23, 59, 59, 999)

        const resultado = builder.comPeriodo(null, dataFim).build()

        expect(resultado).toEqual({ data_acao: { $lte: fimEsperado } })

        expect(resultado.data_acao.$gte).toBeUndefined()
        expect(resultado.data_acao.$lte.getHours()).toBe(23)
        expect(resultado.data_acao.$lte.getMinutes()).toBe(59)
        expect(resultado.data_acao.$lte.getSeconds()).toBe(59)
        expect(resultado.data_acao.$lte.getMilliseconds()).toBe(999)
    })

    test("adiciona período completo com data inicial e final", () => {
        const builder = new AdministracaoFilterBuilder()
        const dataInicio = "2026-01-01T00:00:00"
        const dataFim = "2026-01-31T00:00:00"
        const fimEsperado = new Date(dataFim)

        fimEsperado.setHours(23, 59, 59, 999)

        const resultado = builder.comPeriodo(dataInicio, dataFim).build()

        expect(resultado).toEqual({
            data_acao: {
                $gte: new Date(dataInicio),
                $lte: fimEsperado
            }
        })
    })

    test("combina filtros administrativos com período", () => {
        const builder = new AdministracaoFilterBuilder()
        const inicio = "2026-05-01T00:00:00"
        const fim = "2026-05-31T00:00:00"
        const fimEsperado = new Date(fim)

        fimEsperado.setHours(23, 59, 59, 999)

        const resultado = builder
            .comAdministrador("admin-1")
            .comTipoAcao("RESOLUCAO_DENUNCIA")
            .comPeriodo(inicio, fim)
            .build()

        expect(resultado).toEqual({
            administrador_id: "admin-1",
            tipo_acao: "RESOLUCAO_DENUNCIA",
            data_acao: {
                $gte: new Date(inicio),
                $lte: fimEsperado
            }
        })
    })

    test("permite substituir um período existente", () => {
        const builder = new AdministracaoFilterBuilder()
        const resultado = builder
            .comPeriodo("2026-01-01", "2026-01-31")
            .comPeriodo("2026-06-01", null)
            .build()

        expect(resultado).toEqual({ data_acao: { $gte: new Date("2026-06-01") } })
    })

    test("mantém o período anterior quando não recebe novas datas", () => {
        const builder = new AdministracaoFilterBuilder()
        const resultado = builder
            .comPeriodo("2026-01-01", null)
            .comPeriodo(null, null)
            .build()

        expect(resultado).toEqual({ data_acao: { $gte: new Date("2026-01-01") } })
    })

    test("build retorna a referência dos filtros internos", () => {
        const builder = new AdministracaoFilterBuilder()

        expect(builder.build()).toBe(builder.filtros)
    })
})
