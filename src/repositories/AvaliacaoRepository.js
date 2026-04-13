import AvaliacaoModel from "../models/Avaliacao.js";
import BaseRepository from "./base/BaseRepository.js";
import AvaliacaoFilterBuilder from "./filters/AvaliacaoFilterBuilder.js";

class AvaliacaoRepository extends BaseRepository {
    constructor() {
        super(AvaliacaoModel);
    }

    buscarPorAvaliadorItemTipo(avaliador_id, item_id, tipo) {
        return this.model.findOne({ avaliador_id, item_id, tipo });
    }

    listar({ filtros = {}, page = 1, limit = 15 }) {
        const builder = new AvaliacaoFilterBuilder()
            .comAvaliador(filtros.avaliador_id)
            .comAvaliado(filtros.avaliado_id)
            .comItem(filtros.item_id)
            .comTipo(filtros.tipo);
            
        return this.listarComPaginacao(builder.build(), {
            page,
            limit,
            sort: { data_avaliacao: -1 }
        });
    }



}


export default AvaliacaoRepository;