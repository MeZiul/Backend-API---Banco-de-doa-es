import { CustomError } from "../utils/helpers/index.js";

class AvaliacaoService {

  constructor({ avaliacaoRepository, itemDoacaoRepository, usuarioRepository }) {
    this.repository             = avaliacaoRepository;
    this.itemDoacaoRepository   = itemDoacaoRepository;
    this.usuarioRepository      = usuarioRepository;
  }

  async criar(dados, usuarioId) {
    const { item_id, avaliado_id, nota, comentario, tipo } = dados;

    const item = await this.itemDoacaoRepository.buscarPorId(item_id);
    if (!item) {
      throw new CustomError({
        statusCode: 404,
        customMessage: "Item não encontrado.",
      });
    }

    if (item.status !== "DOADO") {
      throw new CustomError({
        statusCode: 400,
        customMessage: "Avaliações só podem ser feitas após a doação ser confirmada.",
      });
    }

    const trintaDiasAtras = new Date();
    trintaDiasAtras.setDate(trintaDiasAtras.getDate() - 30);
    if (item.data_doacao < trintaDiasAtras) {
      throw new CustomError({
        statusCode: 400,
        customMessage: "O prazo para avaliar esta doação expirou (30 dias).",
      });
    }

    const jaAvaliou = await this.repository.buscarPorAvaliadorItemTipo(
      usuarioId,
      item_id,
      tipo
    );
    if (jaAvaliou) {
      throw new CustomError({
        statusCode: 409,
        customMessage: "Você já avaliou esta doação neste sentido.",
      });
    }

    const avaliacao = await this.repository.criar({
      item_id,
      avaliador_id: usuarioId,
      avaliado_id,
      nota,
      comentario,
      tipo,
    });

    await this._recalcularMedia(avaliado_id);

    return avaliacao;
  }

  async deletar(id) {
    const avaliacao = await this.ensureExists(id);

    await this.repository.deletar(id);

    await this._recalcularMedia(avaliacao.avaliado_id);

    return { message: "Avaliação removida com sucesso." };
  }

  async listarPorUsuario({ filtros = {}, page = 1, limit = 20 }) {
    return this.repository.listar({ filtros, page, limit });
  }

  async buscarPorId(id) {
    return this.ensureExists(id);
  }

  async _recalcularMedia(avaliado_id) {
    const avaliacoes = await this.repository.listar({
      filtros: { avaliado_id },
      page: 1,
      limit: 1000,
    });

    const docs = avaliacoes.docs || avaliacoes;
    const total = docs.length;
    const media = total > 0
      ? docs.reduce((acc, a) => acc + a.nota, 0) / total
      : 0;

    await this.usuarioRepository.atualizar(avaliado_id, {
      media_avaliacoes: parseFloat(media.toFixed(1)),
      total_avaliacoes: total,
    });
  }

  async ensureExists(id) {
    const avaliacao = await this.repository.buscarPorId(id);
    if (!avaliacao) {
      throw new CustomError({
        statusCode: 404,
        customMessage: "Avaliação não encontrada.",
      });
    }
    return avaliacao;
  }
}

export default AvaliacaoService;