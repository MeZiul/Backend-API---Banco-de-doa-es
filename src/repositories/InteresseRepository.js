import BaseRepository from "./base/BaseRepository.js";
import InteresseFilterBuilder from "./filters/InteresseFilterBuilder.js";
import { mapPrismaErrorToLegacy, projectLegacy } from "./prisma/prismaUtils.js";

const RELATIONS = {
  item_id: "item",
  usuario_interessado_id: "usuario_interessado",
  usuario_doador_id: "usuario_doador",
};

class InteresseRepository extends BaseRepository {
  constructor() {
    super("interesse", { relationMap: RELATIONS });
  }

  normalizeData(data) {
    const clean = super.normalizeData(data);
    for (const field of ["mensagem_interessado", "resposta_doador"]) {
      if (typeof clean[field] === "string") clean[field] = clean[field].trim();
    }
    return clean;
  }

  async buscarAtivoPorItemEInteressado(itemId, usuarioInteressadoId) {
    const record = await this.delegate.findFirst({
      where: {
        item_id: itemId,
        usuario_interessado_id: usuarioInteressadoId,
        status: { in: ["PENDENTE", "ACEITO"] },
      },
    });
    return this.mapRecord(record);
  }

  async buscarPorIdDetalhado(id) {
    const record = await this.delegate.findUnique({
      where: { id: String(id) },
      include: {
        item: {
          select: {
            id: true,
            titulo: true,
            status: true,
            cidade: true,
            uf: true,
            total_interesses: true,
          },
        },
        usuario_interessado: {
          select: { id: true, nome: true, email: true, cidade: true, uf: true },
        },
        usuario_doador: {
          select: { id: true, nome: true, email: true, cidade: true, uf: true },
        },
      },
    });
    return this.mapRecord(record);
  }

  async listarPorItem(itemId) {
    const records = await this.delegate.findMany({
      where: { item_id: itemId },
      include: {
        usuario_interessado: {
          select: { id: true, nome: true, email: true, cidade: true, uf: true },
        },
        usuario_doador: {
          select: { id: true, nome: true, email: true, cidade: true, uf: true },
        },
      },
      orderBy: { data_interesse: "desc" },
    });
    return records.map((record) => this.mapRecord(record));
  }

  async buscarAceitoPorItem(itemId) {
    return this.mapRecord(
      await this.delegate.findFirst({
        where: { item_id: itemId, status: "ACEITO" },
      }),
    );
  }

  async listarRecusadosDoAceite(itemId, interesseId, dataResposta) {
    const records = await this.delegate.findMany({
      where: {
        item_id: itemId,
        status: "RECUSADO",
        data_resposta: dataResposta,
        id: { not: String(interesseId) },
      },
    });
    return records.map((record) => this.mapRecord(record));
  }

  async listarAtivosPorItem(itemId) {
    const records = await this.delegate.findMany({
      where: {
        item_id: itemId,
        status: { in: ["PENDENTE", "ACEITO"] },
      },
    });
    return records.map((record) => this.mapRecord(record));
  }

  async listarResumoPorUsuario(usuarioId, limit = 10) {
    const records = await this.delegate.findMany({
      where: {
        OR: [
          { usuario_interessado_id: usuarioId },
          { usuario_doador_id: usuarioId },
        ],
      },
      include: { item: { select: { id: true, titulo: true, status: true } } },
      orderBy: { data_interesse: "desc" },
      take: limit,
    });
    return records.map((record) =>
      projectLegacy(
        this.mapRecord(record),
        "item_id usuario_interessado_id usuario_doador_id status data_interesse data_resposta data_cancelamento",
      ),
    );
  }

  async atualizarSeStatus(id, statusEsperado, dadosAtualizacao) {
    const status = Array.isArray(statusEsperado)
      ? { in: statusEsperado }
      : statusEsperado;

    try {
      return await this.withTransaction(async (tx) => {
        const result = await tx.interesse.updateMany({
          where: { id: String(id), status },
          data: this.normalizeData(dadosAtualizacao),
        });
        if (result.count === 0) return null;

        const record = await tx.interesse.findUnique({
          where: { id: String(id) },
        });
        return this.mapRecord(record);
      });
    } catch (error) {
      throw mapPrismaErrorToLegacy(error);
    }
  }

  async recusarPendentesDoItem(
    itemId,
    interesseAceitoId,
    dadosAtualizacao = {},
  ) {
    const result = await this.delegate.updateMany({
      where: {
        item_id: itemId,
        status: "PENDENTE",
        id: { not: String(interesseAceitoId) },
      },
      data: {
        ...this.normalizeData(dadosAtualizacao),
        status: "RECUSADO",
      },
    });
    return { matchedCount: result.count, modifiedCount: result.count };
  }

  async restaurarRecusadosDoAceite(itemId, interesseAceitoId, dataResposta) {
    const result = await this.delegate.updateMany({
      where: {
        item_id: itemId,
        status: "RECUSADO",
        data_resposta: dataResposta,
        id: { not: String(interesseAceitoId) },
      },
      data: {
        status: "PENDENTE",
        data_resposta: null,
      },
    });
    return { matchedCount: result.count, modifiedCount: result.count };
  }

  listar({ filtros = {}, page = 1, limit = 15 }) {
    const builder = new InteresseFilterBuilder()
      .comItem(filtros.item_id || filtros.itemId)
      .comUsuarioInteressado(
        filtros.usuario_interessado_id || filtros.usuarioInteressadoId,
      )
      .comUsuarioDoador(
        filtros.usuario_doador_id || filtros.usuarioDoadorId,
      )
      .comStatus(filtros.status)
      .comPeriodo(filtros.dataInicio, filtros.dataFim);

    return this.listarComPaginacao(builder.build(), {
      page,
      limit,
      sort: { data_interesse: -1 },
      populate: [
        { path: "item_id", select: "titulo status cidade uf total_interesses" },
        { path: "usuario_interessado_id", select: "nome email cidade uf" },
        { path: "usuario_doador_id", select: "nome email cidade uf" },
      ],
    });
  }
}

export default InteresseRepository;
