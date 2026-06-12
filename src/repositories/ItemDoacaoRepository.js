import path from "path";
import ItemDoacaoModel from "../models/ItemDoacao.js";
import BaseRepository from "./base/BaseRepository.js";
import ItemDoacaoFilterBuilder from "./filters/ItemDoacaoFilterBuilder.js";

class ItemDoacaoRepository extends BaseRepository {
  constructor() {
    super(ItemDoacaoModel);
  }

  listarDisponiveis({ filtros = {}, page = 1, limit = 10, ordenacao }) {
    const builder = new ItemDoacaoFilterBuilder()
      .comStatus("DISPONIVEL")
      .comBuscaTextual(filtros.busca)
      .comCategoria(filtros.categoria_id)
      .comCidade(filtros.cidade)
      .comCondicao(filtros.condicao_item)
      .comUf(filtros.uf);

    const regraDeOrdenacao =
      ItemDoacaoFilterBuilder.construirOrdenacao(ordenacao);

    return this.listarComPaginacao(builder.build(), {
      page,
      limit,
      select:
        "titulo cidade uf condicao_item data_cadastro status fotos usuario_id",
      populate: [
        { path: "categoria_id", select: "nome" },
        { path: "usuario_id", select: "nome cidade media_avaliacoes" },
      ],
      sort: regraDeOrdenacao,
    });
  }

  listarTodos({
    filtros = {},
    page = 1,
    limit = 15,
    ordenacao = "recentes",
  } = {}) {
    const builder = new ItemDoacaoFilterBuilder()
      .comStatus(filtros.status)
      .comBuscaTextual(filtros.busca)
      .comCategoria(filtros.categoria_id || filtros.categoriaId)
      .comCidade(filtros.cidade)
      .comCondicao(filtros.condicao_item || filtros.condicaoItem)
      .comUf(filtros.uf)
      .comUsuario(filtros.usuario_id || filtros.usuarioId);

    return this.listarComPaginacao(builder.build(), {
      page,
      limit,
      sort: ItemDoacaoFilterBuilder.construirOrdenacao(ordenacao),
      populate: [
        { path: "categoria_id", select: "nome descricao" },
        { path: "usuario_id", select: "nome email cidade uf situacao" },
      ],
    });
  }

  buscarDetalhes(id) {
    return this.model
      .findByIdAndUpdate(id, { $inc: { visualizacoes: 1 } }, { new: true })
      .populate({ path: "categoria_id", select: "nome descricao" })
      .populate({
        path: "usuario_id",
        select: "nome cidade uf media_avaliacoes",
      });
  }

  async adicionarFotos(idItem, novasFotos) {
    return this.model.findByIdAndUpdate(
      idItem,
      { $push: { fotos: { $each: novasFotos } } },
      { new: true },
    );
  }

  async removerFoto(idItem, idFoto) {
    return this.model.findByIdAndUpdate(
      idItem,
      { $pull: { fotos: { _id: idFoto } } },
      { new: true },
    );
  }

  async buscarFotosDoItem(idItem) {
    return this.model.findById(idItem).select("fotos usuario_id status");
  }

  async listarPorUsuario(usuarioId) {
    return this.model
      .find({ usuario_id: usuarioId })
      .populate({ path: "categoria_id", select: "nome" })
      .sort({ data_cadastro: -1 });
  }

  async buscarEmAndamentoPorUsuario(usuarioId) {
    return this.model.find({
      usuario_id: usuarioId,
      status: { $in: ["RESERVADO", "AGUARDANDO_CONFIRMACAO"] },
    });
  }

  async cancelarItensPorUsuario(usuarioId) {
    return this.model.updateMany(
      {
        usuario_id: usuarioId,
        status: { $in: ["DISPONIVEL", "RESERVADO", "AGUARDANDO_CONFIRMACAO"] },
      },
      { status: "CANCELADO" },
    );
  }

  incrementarInteressesSeDisponivel(itemId) {
    return this.model.findOneAndUpdate(
      { _id: itemId, status: "DISPONIVEL" },
      { $inc: { total_interesses: 1 } },
      { new: true, runValidators: true },
    );
  }

  reservarSeDisponivel(itemId, interesseId) {
    return this.model.findOneAndUpdate(
      {
        _id: itemId,
        status: "DISPONIVEL",
        $or: [
          { interesse_aceito_id: null },
          { interesse_aceito_id: { $exists: false } },
        ],
      },
      {
        $set: {
          status: "RESERVADO",
          interesse_aceito_id: interesseId,
        },
      },
      { new: true, runValidators: true },
    );
  }

  liberarReservaDoInteresse(itemId, interesseId) {
    return this.model.findOneAndUpdate(
      {
        _id: itemId,
        status: "RESERVADO",
        interesse_aceito_id: interesseId,
      },
      {
        $set: {
          status: "DISPONIVEL",
          interesse_aceito_id: null,
        },
      },
      { new: true, runValidators: true },
    );
  }

  restaurarReservaSeDisponivel(itemId, interesseId) {
    return this.reservarSeDisponivel(itemId, interesseId);
  }
}

export default ItemDoacaoRepository;
