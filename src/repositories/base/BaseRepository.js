class BaseRepository {
    constructor(model) {
        this.model = model;
    }
    buscarPorId(id, options = {}) {
        const query = this.model.findById(id);
        if (options.select) query.select(options.select);
        return query;
    }

    criar(dados) {
        return this.model.create(dados);
    }

    atualizar(id, dados) {
        return this.model.findByIdAndUpdate(id, dados, { new: true , runValidators: false});

    }

    deletar(id) {
        return this.model.findByIdAndDelete(id);
    }

    listarComPaginacao(filtro, options) {
        return this.model.paginate(filtro, options);
    }

}


export default BaseRepository;