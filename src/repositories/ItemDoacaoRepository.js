import BaseRepository from "./base/BaseRepository.js";
import ItemDoacaoFilterBuilder from "./filters/ItemDoacaoFilterBuilder.js";
import {
  mapPrismaErrorToLegacy,
  projectLegacy,
  toPrismaWhere,
} from "./prisma/prismaUtils.js";

const RELATIONS = {
  categoria_id: "categoria",
  usuario_id: "usuario",
  interesse_aceito_id: "interesse_aceito",
};

const DEFAULT_INCLUDE = {
  fotos: {
    orderBy: { ordem: "asc" },
  },
};

const ADMIN_ITEM_SELECT = [
  "usuario_id",
  "categoria_id",
  "titulo",
  "descricao",
  "condicao_item",
  "cidade",
  "uf",
  "bairro",
  "condicoes_doacao",
  "status",
  "fotos",
  "data_doacao",
  "visualizacoes",
  "total_interesses",
  "data_cadastro",
  "data_atualizacao",
].join(" ");

class ItemDoacaoRepository extends BaseRepository {
  constructor() {
    super("itemDoacao", {
      relationMap: RELATIONS,
      defaultInclude: DEFAULT_INCLUDE,
    });
  }

  normalizeData(data, { mode = "update" } = {}) {
    const clean = super.normalizeData(data);

    if (clean.$push || clean.$pull) {
      return clean;
    }

    if (typeof clean.uf === "string") clean.uf = clean.uf.trim().toUpperCase();

    if (Array.isArray(clean.fotos)) {
      const fotos = clean.fotos.map((foto) => {
        const copy = { ...foto };
        delete copy._id;
        delete copy.id;
        delete copy.item_id;
        return copy;
      });

      clean.fotos =
        mode === "create"
          ? { create: fotos }
          : { deleteMany: {}, create: fotos };
    }

    return clean;
  }

  async criar(dados) {
    try {
      const record = await this.delegate.create({
        data: this.normalizeData(dados, { mode: "create" }),
        include: DEFAULT_INCLUDE,
      });
      return this.mapRecord(record);
    } catch (error) {
      throw mapPrismaErrorToLegacy(error);
    }
  }

  async atualizar(id, dados) {
    if (dados?.$push?.fotos?.$each) {
      return this.adicionarFotos(id, dados.$push.fotos.$each);
    }

    if (dados?.$pull?.fotos?._id) {
      return this.removerFoto(id, dados.$pull.fotos._id);
    }

    try {
      const record = await this.delegate.update({
        where: { id: String(id) },
        data: this.normalizeData(dados, { mode: "update" }),
        include: DEFAULT_INCLUDE,
      });
      return this.mapRecord(record);
    } catch (error) {
      if (error?.code === "P2025") return null;
      throw mapPrismaErrorToLegacy(error);
    }
  }

  listarDisponiveis({ filtros = {}, page = 1, limit = 10, ordenacao }) {
    const builder = new ItemDoacaoFilterBuilder()
      .comStatus("DISPONIVEL")
      .comBuscaTextual(filtros.busca)
      .comCategoria(filtros.categoria_id)
      .comCidade(filtros.cidade)
      .comCondicao(filtros.condicao_item)
      .comUf(filtros.uf);

    return this.listarComPaginacao(builder.build(), {
      page,
      limit,
      select:
        "titulo cidade uf condicao_item data_cadastro status fotos usuario_id categoria_id",
      populate: [
        { path: "categoria_id", select: "nome" },
        { path: "usuario_id", select: "nome cidade media_avaliacoes" },
      ],
      sort: ItemDoacaoFilterBuilder.construirOrdenacao(ordenacao),
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
      .comUsuario(filtros.usuario_id || filtros.usuarioId)
      .comPeriodo(filtros.dataInicio, filtros.dataFim);

    return this.listarComPaginacao(builder.build(), {
      page,
      limit,
      select: ADMIN_ITEM_SELECT,
      sort: ItemDoacaoFilterBuilder.construirOrdenacao(ordenacao),
      populate: [
        { path: "categoria_id", select: "nome descricao" },
        { path: "usuario_id", select: "nome email cidade uf situacao" },
      ],
    });
  }

  async buscarDetalhes(id) {
    try {
      const record = await this.delegate.update({
        where: { id: String(id) },
        data: { visualizacoes: { increment: 1 } },
        include: {
          ...DEFAULT_INCLUDE,
          categoria: { select: { id: true, nome: true, descricao: true } },
          usuario: {
            select: {
              id: true,
              nome: true,
              cidade: true,
              uf: true,
              media_avaliacoes: true,
            },
          },
        },
      });
      return this.mapRecord(record);
    } catch (error) {
      if (error?.code === "P2025") return null;
      throw mapPrismaErrorToLegacy(error);
    }
  }

  async adicionarFotos(idItem, novasFotos) {
    try {
      return await this.withTransaction(async (tx) => {
        const existing = await tx.itemDoacao.findUnique({
          where: { id: String(idItem) },
          select: { id: true },
        });
        if (!existing) return null;

        if (novasFotos.length) {
          await tx.fotoItemDoacao.createMany({
            data: novasFotos.map((foto) => ({
              item_id: String(idItem),
              url: foto.url,
              ordem: foto.ordem,
              nome_original: foto.nome_original ?? null,
              tamanho: foto.tamanho ?? null,
              mime_type: foto.mime_type ?? null,
              data_upload: foto.data_upload ?? new Date(),
            })),
          });
        }

        const record = await tx.itemDoacao.findUnique({
          where: { id: String(idItem) },
          include: DEFAULT_INCLUDE,
        });
        return this.mapRecord(record);
      });
    } catch (error) {
      throw mapPrismaErrorToLegacy(error);
    }
  }

  async removerFoto(idItem, idFoto) {
    return this.withTransaction(async (tx) => {
      const existing = await tx.itemDoacao.findUnique({
        where: { id: String(idItem) },
        select: { id: true },
      });
      if (!existing) return null;

      await tx.fotoItemDoacao.deleteMany({
        where: {
          item_id: String(idItem),
          id: String(idFoto),
        },
      });

      const record = await tx.itemDoacao.findUnique({
        where: { id: String(idItem) },
        include: DEFAULT_INCLUDE,
      });
      return this.mapRecord(record);
    });
  }

  async buscarFotosDoItem(idItem) {
    const record = await this.delegate.findUnique({
      where: { id: String(idItem) },
      include: DEFAULT_INCLUDE,
    });
    return projectLegacy(this.mapRecord(record), "fotos usuario_id status");
  }

  async listarPorUsuario(usuarioId) {
    const records = await this.delegate.findMany({
      where: { usuario_id: usuarioId },
      include: {
        ...DEFAULT_INCLUDE,
        categoria: { select: { id: true, nome: true } },
      },
      orderBy: { data_cadastro: "desc" },
    });
    return records.map((record) => this.mapRecord(record));
  }

  async listarResumoPorUsuario(usuarioId, limit = 10) {
    const records = await this.delegate.findMany({
      where: { usuario_id: usuarioId },
      include: { categoria: { select: { id: true, nome: true } } },
      orderBy: { data_cadastro: "desc" },
      take: limit,
    });
    return records.map((record) =>
      projectLegacy(
        this.mapRecord(record),
        "categoria_id titulo status total_interesses data_cadastro data_doacao",
      ),
    );
  }

  async listarIdsPorUsuario(usuarioId) {
    const records = await this.delegate.findMany({
      where: { usuario_id: usuarioId },
      select: { id: true },
    });
    return records.map((record) => this.mapRecord(record));
  }

  async buscarEmAndamentoPorUsuario(usuarioId) {
    const records = await this.delegate.findMany({
      where: {
        usuario_id: usuarioId,
        status: { in: ["RESERVADO", "AGUARDANDO_CONFIRMACAO"] },
      },
      include: DEFAULT_INCLUDE,
    });
    return records.map((record) => this.mapRecord(record));
  }

  async listarDisponiveisPorUsuario(usuarioId) {
    const records = await this.delegate.findMany({
      where: {
        usuario_id: usuarioId,
        status: "DISPONIVEL",
      },
      include: DEFAULT_INCLUDE,
    });
    return records.map((record) => projectLegacy(this.mapRecord(record), "status"));
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
        const result = await tx.itemDoacao.updateMany({
          where: {
            id: String(id),
            status,
            ...toPrismaWhere(filtrosAdicionais),
          },
          data: this.normalizeData(dadosAtualizacao),
        });

        if (result.count === 0) return null;

        const record = await tx.itemDoacao.findUnique({
          where: { id: String(id) },
          include: DEFAULT_INCLUDE,
        });
        return this.mapRecord(record);
      });
    } catch (error) {
      throw mapPrismaErrorToLegacy(error);
    }
  }

  async cancelarItensPorUsuario(usuarioId) {
    const result = await this.delegate.updateMany({
      where: {
        usuario_id: usuarioId,
        status: {
          in: ["DISPONIVEL", "RESERVADO", "AGUARDANDO_CONFIRMACAO"],
        },
      },
      data: { status: "CANCELADO" },
    });
    return { matchedCount: result.count, modifiedCount: result.count };
  }

  incrementarInteressesSeDisponivel(itemId) {
    return this.atualizarSeStatus(itemId, "DISPONIVEL", {
      total_interesses: { increment: 1 },
    });
  }

  reservarSeDisponivel(itemId, interesseId) {
    return this.atualizarSeStatus(
      itemId,
      "DISPONIVEL",
      {
        status: "RESERVADO",
        interesse_aceito_id: String(interesseId),
      },
      { interesse_aceito_id: null },
    );
  }

  liberarReservaDoInteresse(itemId, interesseId) {
    return this.atualizarSeStatus(
      itemId,
      "RESERVADO",
      {
        status: "DISPONIVEL",
        interesse_aceito_id: null,
      },
      { interesse_aceito_id: String(interesseId) },
    );
  }

  restaurarReservaSeDisponivel(itemId, interesseId) {
    return this.reservarSeDisponivel(itemId, interesseId);
  }
}

export default ItemDoacaoRepository;
