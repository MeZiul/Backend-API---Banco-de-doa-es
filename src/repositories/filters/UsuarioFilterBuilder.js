class UsuarioFilterBuilder {
    constructor() {
        this.filtros = {};
    }

    comNome(nome) {
        if (nome) this.filtros.nome = { $regex: nome, $options: "i" };
    
        return this;
    }

    comEmail(email) {
        if (email) this.filtros.email = { $regex: email, $options: "i" };
        return this;
    }

    comCpf(cpf) {
        if (cpf) this.filtros.cpf = { $regex: cpf, $options: "i" };
        
        return this;
    }

    comCidade(cidade) {
        if (cidade) this.filtros.cidade = { $regex: cidade, $options: "i" };
        
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

    build() {
        return this.filtros;
    }
}

export default UsuarioFilterBuilder;