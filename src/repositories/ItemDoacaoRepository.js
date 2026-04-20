// src/repositories/ItemDoacaoRepository.js

import ItemDoacaoModel from "../models/ItemDoacao.js";
import BaseRepository from "./base/BaseRepository.js";
import ItemDoacaoFilterBuilder from "../filters/ItemDoacaoFilterBuilder.js";

class ItemDoacaoRepository extends BaseRepository {
    constructor() {
        super(ItemDoacaoModel);
    }

    listarDisponiveis({ filtros = {}, page = 1, limit = 10 }) {
        const builder = new ItemDoacaoFilterBuilder()
            .comStatus("DISPONIVEL") // RN-BUSCA-002: Força o status
            .comBusca(filtros.busca)
            .comCategoria(filtros.categoria_id)
            .comCidade(filtros.cidade)
            .comCondicao(filtros.condicao_item)
            .comUf(filtros.uf);

        return this.listarComPaginacao(builder.build(), {
            page,
            limit,
            select: 'titulo cidade uf condicao_item data_cadastro status',
            populate: [{ path: 'categoria_id', select: 'nome' }],
            sort: { data_cadastro: -1 }
        });
    }

    buscarDetalhes(id) {

        return this.model.findByIdAndUpdate(
            id,
            { $inc: { visualizacoes: 1 } },
            { new: true }
        )
        .populate({ path: 'categoria_id', select: 'nome descricao' })
        .populate({ path: 'usuario_id', select: 'nome cidade uf avaliacao_media' });
    }
}

export default ItemDoacaoRepository();