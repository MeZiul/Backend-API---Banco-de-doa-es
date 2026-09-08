class InteresseFilterBuilder {
    constructor() {
        this.filtros = {};
    }

    comItem(itemId) {
        if (itemId) this.filtros.item_id = itemId;
        return this;
    }

    comUsuarioInteressado(usuarioInteressadoId) {
        if (usuarioInteressadoId) this.filtros.usuario_interessado_id = usuarioInteressadoId;
        return this;
    }

    comUsuarioDoador(usuarioDoadorId) {
        if (usuarioDoadorId) this.filtros.usuario_doador_id = usuarioDoadorId;
        return this;
    }

    comStatus(status) {
        if (status) this.filtros.status = status;
        return this;
    }

    comPeriodo(dataInicio, dataFim) {
        if (dataInicio || dataFim) {
            this.filtros.data_interesse = {};

            if (dataInicio) this.filtros.data_interesse.$gte = new Date(dataInicio);

            if (dataFim) {
                const fim = new Date(dataFim);
                fim.setHours(23, 59, 59, 999);
                this.filtros.data_interesse.$lte = fim;
            }
        }

        return this;
    }

    build() {
        return this.filtros;
    }
}

export default InteresseFilterBuilder;
