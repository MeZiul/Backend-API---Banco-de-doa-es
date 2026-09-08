const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

class UsuarioFilterBuilder {
    constructor() {
        this.filtros = {};
    }

    comNome(nome) {
        if (nome) this.filtros.nome = { $regex: escapeRegex(nome), $options: "i" };
    
        return this;
    }

    comEmail(email) {
        if (email) this.filtros.email = { $regex: escapeRegex(email), $options: "i" };
        return this;
    }

    comCpf(cpf) {
        if (cpf) this.filtros.cpf = { $regex: escapeRegex(cpf), $options: "i" };
        
        return this;
    }

    comCidade(cidade) {
        if (cidade) this.filtros.cidade = { $regex: escapeRegex(cidade), $options: "i" };
        
        return this;
    }

    comUf(uf) {
        if (uf) this.filtros.uf = uf;
        
        return this;
    }

    comSituacao(situacao) {
        if (situacao) this.filtros.situacao = situacao;
        
        return this;
    }

    comPerfil(perfil) {
        if (perfil) this.filtros.perfil = perfil;
        
        return this;
    }

    comPeriodo(dataInicio, dataFim) {
        if (dataInicio || dataFim) {
            this.filtros.data_cadastro = {};

            if (dataInicio) this.filtros.data_cadastro.$gte = new Date(dataInicio);

            if (dataFim) {
                const fim = new Date(dataFim);
                fim.setHours(23, 59, 59, 999);
                this.filtros.data_cadastro.$lte = fim;
            }
        }

        return this;
    }

    build() {
        return this.filtros;
    }
}

export default UsuarioFilterBuilder;
