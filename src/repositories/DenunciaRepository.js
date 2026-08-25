import BaseRepository from "./base/BaseRepository.js";
import DenunciaFilterBuilder from "./filters/DenunciaFilterBuilder.js";
import {
  mapPrismaErrorToLegacy,
  projectLegacy,
  toPrismaWhere,
} from "./prisma/prismaUtils.js";

const RELATIONS = {
  denunciante_id: "denunciante",
  alvo_item_id: "alvo_item",
  alvo_usuario_id: "alvo_usuario",
  admin_id: "admin",
};

class DenunciaRepository extends BaseRepository {
  constructor() {
    super("denuncia", { relationMap: RELATIONS });
  }

  normalizeData(data) {
    const clean = super.normalizeData(data);
    for (const field of ["descricao", "resposta_admin", "acao_tomada"]) {
      if (typeof clean[field] === "string") clean[field] = clean[field].trim();
    }
    return clean;
  }

  async buscarEmAnalisePorItemEDenunciante(denuncianteId, alvoItemId) {
    return this.mapRecord(
      await this.delegate.findFirst({
        where: {
          denunciante_id: denuncianteId,
          alvo_item_id: alvoItemId,
          status: "EM_ANALISE",
        },
      }),
    );
  }

  async buscarEmAnalisePorUsuarioEDenunciante(
    denuncianteId,
    alvoUsuarioId,
  ) {
    return this.mapRecord(
      await this.delegate.findFirst({
        where: {
          denunciante_id: denuncianteId,
          alvo_usuario_id: alvoUsuarioId,
          status: "EM_ANALISE",
        },
      }),
    );
  }

  async buscarPorIdDetalhado(id) {
    const record = await this.delegate.findUnique({
      where: { id: String(id) },
      include: {
        denunciante: {
          select: { id: true, nome: true, email: true, cidade: true, uf: true, situacao: true },
        },
        alvo_item: {
          select: { id: true, titulo: true, status: true, cidade: true, uf: true, usuario_id: true },
        },
        alvo_usuario: {
          select: { id: true, nome: true, email: true, cidade: true, uf: true, situacao: true },
        },
        admin: { select: { id: true, nome: true, email: true } },
      },
    });
    return this.mapRecord(record);
  }

  async atualizarSeStatus(
    id,
    statusEsperado,
    dadosAtualizacao,
    filtrosAdicionais = {},
  ) {
    const status = Array.isArray(statusEsperado)
      ? { in: statusEsperado }
      : statusEsperado;

    try {
      return await this.withTransaction(async (tx) => {
        const result = await tx.denuncia.updateMany({
          where: {
            id: String(id),
            status,
            ...toPrismaWhere(filtrosAdicionais),
          },
          data: this.normalizeData(dadosAtualizacao),
        });
        if (result.count === 0) return null;
        return this.mapRecord(
          await tx.denuncia.findUnique({ where: { id: String(id) } }),
        );
      });
    } catch (error) {
      throw mapPrismaErrorToLegacy(error);
    }
  }

  async deletarSeEmAnalise(id, denuncianteId) {
    return this.withTransaction(async (tx) => {
      const where = {
        id: String(id),
        denunciante_id: denuncianteId,
        status: "EM_ANALISE",
      };
      const existing = await tx.denuncia.findFirst({
        where,
      });
      if (!existing) return null;

      const result = await tx.denuncia.deleteMany({ where });
      if (result.count === 0) return null;

      return this.mapRecord(existing);
    });
  }

  listarEmAnalise({ page = 1, limit = 15 } = {}) {
    return this.listar({
      filtros: { status: "EM_ANALISE" },
      page,
      limit,
    });
  }

  async listarResumoPorUsuario(usuarioId, itemIds = [], limit = 10) {
    const OR = [
      { denunciante_id: usuarioId },
      { alvo_usuario_id: usuarioId },
    ];
    if (itemIds.length > 0) {
      OR.push({ alvo_item_id: { in: itemIds } });
    }

    const records = await this.delegate.findMany({
      where: { OR },
      include: { alvo_item: { select: { id: true, titulo: true, status: true } } },
      orderBy: { data_denuncia: "desc" },
      take: limit,
    });
    return records.map((record) =>
      projectLegacy(
        this.mapRecord(record),
        "denunciante_id tipo_alvo alvo_item_id alvo_usuario_id motivo status data_denuncia data_analise",
      ),
    );
  }

  listar({ filtros = {}, page = 1, limit = 15 }) {
    const query = new DenunciaFilterBuilder()
      .comDenunciante(filtros.denunciante_id || filtros.denuncianteId)
      .comTipoAlvo(filtros.tipo_alvo || filtros.tipoAlvo)
      .comAlvoItem(filtros.alvo_item_id || filtros.alvoItemId)
      .comAlvoUsuario(filtros.alvo_usuario_id || filtros.alvoUsuarioId)
      .comMotivo(filtros.motivo)
      .comStatus(filtros.status)
      .comAdmin(filtros.admin_id || filtros.adminId)
      .comPeriodo(filtros.dataInicio, filtros.dataFim)
      .build();

    return this.listarComPaginacao(query, {
      page,
      limit,
      sort: { data_denuncia: -1 },
      populate: [
        { path: "denunciante_id", select: "nome email cidade uf situacao" },
        { path: "alvo_item_id", select: "titulo status cidade uf usuario_id" },
        { path: "alvo_usuario_id", select: "nome email cidade uf situacao" },
        { path: "admin_id", select: "nome email" },
      ],
    });
  }
}

export default DenunciaRepository;
