class AdministracaoFilterBuilder {
    constructor() {
        this.filtros = {};
    }

    comAdministrador(administradorId) {
        if (administradorId) this.filtros.administrador_id = administradorId;
        return this;
    }

    comTipoAcao(tipoAcao) {
        if (tipoAcao) this.filtros.tipo_acao = tipoAcao;
        return this;
    }

    comTipoAlvo(tipoAlvo) {
        if (tipoAlvo) this.filtros.tipo_alvo = tipoAlvo;
        return this;
    }

    comAlvo(alvoId) {
        if (alvoId) this.filtros.alvo_id = alvoId;
        return this;
    }

    comResultadoDenuncia(resultadoDenuncia) {
        if (resultadoDenuncia) this.filtros.resultado_denuncia = resultadoDenuncia;
        return this;
    }

    comPeriodo(dataInicio, dataFim) {
        if (dataInicio || dataFim) {
            this.filtros.data_acao = {};

            if (dataInicio) this.filtros.data_acao.$gte = new Date(dataInicio);

            if (dataFim) {
                const fim = new Date(dataFim);
                fim.setHours(23, 59, 59, 999);
                this.filtros.data_acao.$lte = fim;
            }
        }

        return this;
    }

    build() {
        return this.filtros;
    }
}

export default AdministracaoFilterBuilder;
