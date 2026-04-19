class DenunciaFilterBuilder {
    constructor() {
        this.filtros = {};
    }

    comDenunciante(denuncianteId) {
        if (denuncianteId) this.filtros.denunciante_id = denuncianteId;
        return this;
    }

    comTipoAlvo(tipoAlvo) {
        if (tipoAlvo) this.filtros.tipo_alvo = tipoAlvo;
        return this;
    }

    comAlvoItem(alvoItemId) {
        if (alvoItemId) this.filtros.alvo_item_id = alvoItemId;
        return this;
    }

    comAlvoUsuario(alvoUsuarioId) {
        if (alvoUsuarioId) this.filtros.alvo_usuario_id = alvoUsuarioId;
        return this;
    }

    comMotivo(motivo) {
        if (motivo) this.filtros.motivo = motivo;
        return this;
    }

    comStatus(status) {
        if (status) this.filtros.status = status;
        return this;
    }

    comAdmin(adminId) {
        if (adminId) this.filtros.admin_id = adminId;
        return this;
    }

    comPeriodo(dataInicio, dataFim) {
        if (dataInicio || dataFim) {
            this.filtros.data_denuncia = {};

            if (dataInicio) this.filtros.data_denuncia.$gte = new Date(dataInicio);

            if (dataFim) {
                const fim = new Date(dataFim);
                fim.setHours(23, 59, 59, 999);
                this.filtros.data_denuncia.$lte = fim;
            }
        }

        return this;
    }

    build() {
        return this.filtros;
    }
}

export default DenunciaFilterBuilder;
