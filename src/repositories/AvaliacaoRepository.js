import BaseRepository from "./base/BaseRepository.js";
import AvaliacaoFilterBuilder from "./filters/AvaliacaoFilterBuilder.js";
import { projectLegacy } from "./prisma/prismaUtils.js";

const RELATIONS = {
  item_id: "item",
  avaliador_id: "avaliador",
  avaliado_id: "avaliado",
};

class AvaliacaoRepository extends BaseRepository {
  constructor() {
    super("avaliacao", { relationMap: RELATIONS });
  }

  normalizeData(data) {
    const clean = super.normalizeData(data);
    if (typeof clean.comentario === "string") clean.comentario = clean.comentario.trim();
    return clean;
  }

  async buscarPorAvaliador(avaliador_id) {
    return this.mapRecord(
      await this.delegate.findFirst({ where: { avaliador_id } }),
    );
  }

  async buscarPorAvaliado(avaliado_id) {
    return this.mapRecord(
      await this.delegate.findFirst({ where: { avaliado_id } }),
    );
  }

  async buscarPorItem(item_id) {
    return this.mapRecord(
      await this.delegate.findFirst({ where: { item_id } }),
    );
  }

  async buscarPorTipo(tipo) {
    return this.mapRecord(
      await this.delegate.findFirst({ where: { tipo } }),
    );
  }

  async buscarPorAvaliadorItemTipo(avaliador_id, item_id, tipo) {
    return this.mapRecord(
      await this.delegate.findFirst({
        where: { avaliador_id, item_id, tipo },
      }),
    );
  }

  async listarResumoPorUsuario(usuarioId, limit = 10) {
    const records = await this.delegate.findMany({
      where: {
        OR: [
          { avaliador_id: usuarioId },
          { avaliado_id: usuarioId },
        ],
      },
      include: {
        item: { select: { id: true, titulo: true } },
        avaliador: { select: { id: true, nome: true } },
        avaliado: { select: { id: true, nome: true } },
      },
      orderBy: { data_avaliacao: "desc" },
      take: limit,
    });
    return records.map((record) =>
      projectLegacy(
        this.mapRecord(record),
        "item_id avaliador_id avaliado_id nota tipo data_avaliacao",
      ),
    );
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
        { path: "avaliador_id", select: "nome" },
        { path: "avaliado_id", select: "nome" },
        { path: "item_id", select: "titulo" },
      ],
    });
  }
}

export default AvaliacaoRepository;
