import AvaliacaoModel from "../models/Avaliacao.js";
import BaseRepository from "./base/BaseRepository.js";
import AvaliacaoFilterBuilder from "./filters/AvaliacaoFilterBuilder.js";

class AvaliacaoRepository extends BaseRepository {
  constructor() {
    super(AvaliacaoModel);
  }

  buscarPorAvaliador(avaliador_id) {
    return this.model.findOne({ avaliador_id });
  }

  buscarPorAvaliado(avaliado_id) {
    return this.model.findOne({ avaliado_id });
  }

  buscarPorItem(item_id) {
    return this.model.findOne({ item_id });
  }
  buscarPorTipo(tipo) {
    return this.model.findOne({ tipo });
  }

  buscarPorAvaliadorItemTipo(avaliador_id, item_id, tipo) {
    return this.model.findOne({ avaliador_id, item_id, tipo });
  }

  listarResumoPorUsuario(usuarioId, limit = 10) {
    return this.model.find({
      $or: [
        { avaliador_id: usuarioId },
        { avaliado_id: usuarioId },
      ],
    })
      .select("item_id avaliador_id avaliado_id nota tipo data_avaliacao")
      .populate("item_id", "titulo")
      .populate("avaliador_id", "nome")
      .populate("avaliado_id", "nome")
      .sort({ data_avaliacao: -1 })
      .limit(limit);
  }

  listar({ filtros = {}, page = 1, limit = 15, usuarioId }) {
    const builder = new AvaliacaoFilterBuilder()
      .comAvaliador(filtros.avaliador_id)
      .comAvaliado(filtros.avaliado_id)
      .comItem(filtros.item_id)
      .comTipo(filtros.tipo);

    const filtro = builder.build();

    if (usuarioId) {
      filtro.$or = [
        { avaliador_id: usuarioId },
        { avaliado_id: usuarioId },
      ];
    }

    return this.listarComPaginacao(filtro, {
      page,
      limit,
      sort: { data_avaliacao: -1 },
      populate: [
        { path: "avaliador_id", select: "nome " },
        { path: "avaliado_id", select: "nome " },
        { path: "item_id", select: "titulo" },
      ],
    });
  }
}

export default AvaliacaoRepository;
