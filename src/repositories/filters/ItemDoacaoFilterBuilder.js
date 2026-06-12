const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

class ItemDoacaoFilterBuilder {
    constructor() {
        this.query = {};
    }

    comStatus(status = "DISPONIVEL") {
        if (status) {
            this.query.status = status;
        }
        return this;
    }

    comBuscaTextual(texto) {
        if (texto) {
            const regex = new RegExp(escapeRegex(texto), 'i'); // 'i' torna case-insensitive
            this.query.$or = [
                { titulo: regex },
                { descricao: regex }
            ];
        }
        return this;
    }

    comCategoria(categoriaId) {
        if (categoriaId) {
            this.query.categoria_id = categoriaId;
        }
        return this;
    }

    comCidade(cidade) {
        if (cidade) {
            this.query.cidade = new RegExp(escapeRegex(cidade), 'i');
        }
        return this;
    }

    comCondicao(condicaoItem) {
        if (condicaoItem) {
            this.query.condicao_item = condicaoItem;
        }
        return this;
    }

    comUf(uf) {
        if (uf) {
            this.query.uf = uf.toUpperCase(); // Garante o formato correto
        }
        return this;
    }

    comUsuario(usuarioId) {
        if (usuarioId) {
            this.query.usuario_id = usuarioId;
        }
        return this;
    }

    comPeriodo(dataInicio, dataFim) {
        if (dataInicio || dataFim) {
            this.query.data_cadastro = {};

            if (dataInicio) this.query.data_cadastro.$gte = new Date(dataInicio);

            if (dataFim) {
                const fim = new Date(dataFim);
                fim.setHours(23, 59, 59, 999);
                this.query.data_cadastro.$lte = fim;
            }
        }

        return this;
    }

    build() {
        return this.query;
    }

    static construirOrdenacao(tipoOrdenacao) {
        switch (tipoOrdenacao) {
            case 'antigos':
                return { data_cadastro: 1 }; // Crescente (mais antigos primeiro)
            case 'visualizados':
                return { visualizacoes: -1 }; // Decrescente (mais vistos primeiro)
            case 'interessados':
                return { total_interesses: -1 }; // Decrescente (mais desejados primeiro)
            case 'recentes':
            default:
                // RN-BUSCA-012: Ordenação padrão
                return { data_cadastro: -1 }; // Decrescente (mais recentes primeiro)
        }
    }
}

export default ItemDoacaoFilterBuilder;
