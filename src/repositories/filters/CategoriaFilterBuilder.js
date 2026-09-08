class CategoriaFilterBuilder {
    constructor() {
        this.filtros = {};
    }

    comNome(nome) {
        if (nome) this.filtros.nome = { $regex: nome, $options: "i" };
        return this;
    }

    comAtivo(ativo) {
        if (ativo === "true" || ativo === true) this.filtros.ativo = true;
        if (ativo === "false" || ativo === false) this.filtros.ativo = false;
        return this;
    }


    build() {
        return this.filtros;
    }







}



export default CategoriaFilterBuilder;