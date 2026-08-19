import BaseRepository from "./base/BaseRepository.js";
import AdministracaoFilterBuilder from "./filters/AdministracaoFilterBuilder.js";

const RELATIONS = {
  administrador_id: "administrador",
};

const ADMINISTRADOR_SELECT = {
  id: true,
  nome: true,
  email: true,
  perfil: true,
  situacao: true,
};

const ALVO_INCLUDE = {
  alvo_usuario: {
    select: {
      id: true,
      nome: true,
      email: true,
      perfil: true,
      situacao: true,
    },
  },
  alvo_item: {
    select: {
      id: true,
      titulo: true,
      status: true,
    },
  },
  alvo_denuncia: {
    select: {
      id: true,
      tipo_alvo: true,
      motivo: true,
      status: true,
    },
  },
};

class AdministracaoRepository extends BaseRepository {
  constructor() {
    super("administracao", { relationMap: RELATIONS });
  }

  normalizeData(data) {
    const clean = super.normalizeData(data);

    for (const field of [
      "justificativa",
      "resposta_administrativa",
      "acao_tomada",
    ]) {
      if (typeof clean[field] === "string") clean[field] = clean[field].trim();
    }

    const alvoId = clean.alvo_id;
    const tipoAlvo = clean.tipo_alvo;

    delete clean.alvo_id;
    delete clean.alvo_model;

    if (alvoId) {
      clean.alvo_usuario_id = tipoAlvo === "USUARIO" ? String(alvoId) : null;
      clean.alvo_item_id = tipoAlvo === "ITEM" ? String(alvoId) : null;
      clean.alvo_denuncia_id = tipoAlvo === "DENUNCIA" ? String(alvoId) : null;
    }

    return clean;
  }

  transformWhere(where) {
    if (!where || typeof where !== "object") return where;

    const clone = { ...where };
    const alvoId = clone.alvo_id;
    delete clone.alvo_id;

    if (alvoId) {
      clone.OR = [
        { alvo_usuario_id: alvoId },
        { alvo_item_id: alvoId },
        { alvo_denuncia_id: alvoId },
      ];
    }

    return clone;
  }

  mapRecord(record, options = {}) {
    if (!record) return null;

    const mapped = super.mapRecord(record, options);
    const raw = record;

    let targetValue = null;
    let targetModel = null;

    if (raw.tipo_alvo === "USUARIO") {
      targetValue = raw.alvo_usuario ?? raw.alvo_usuario_id ?? null;
      targetModel = "Usuario";
    } else if (raw.tipo_alvo === "ITEM") {
      targetValue = raw.alvo_item ?? raw.alvo_item_id ?? null;
      targetModel = "ItemDoacao";
    } else if (raw.tipo_alvo === "DENUNCIA") {
      targetValue = raw.alvo_denuncia ?? raw.alvo_denuncia_id ?? null;
      targetModel = "Denuncia";
    }

    if (targetValue && typeof targetValue === "object") {
      const nested = super.mapRecord(targetValue, options);
      mapped.alvo_id = nested;
    } else {
      mapped.alvo_id = targetValue;
    }

    mapped.alvo_model = targetModel;
    delete mapped.alvo_usuario_id;
    delete mapped.alvo_item_id;
    delete mapped.alvo_denuncia_id;
    delete mapped.alvo_usuario;
    delete mapped.alvo_item;
    delete mapped.alvo_denuncia;

    return mapped;
  }

  async buscarPorIdDetalhado(id) {
    const record = await this.delegate.findUnique({
      where: { id: String(id) },
      include: {
        administrador: { select: ADMINISTRADOR_SELECT },
        ...ALVO_INCLUDE,
      },
    });
    return this.mapRecord(record);
  }

  async buscarUltimaAcaoPorAlvo(alvoId) {
    const record = await this.delegate.findFirst({
      where: {
        OR: [
          { alvo_usuario_id: String(alvoId) },
          { alvo_item_id: String(alvoId) },
          { alvo_denuncia_id: String(alvoId) },
        ],
      },
      orderBy: { data_acao: "desc" },
    });
    return this.mapRecord(record);
  }

  listarPorAlvo(alvoId, { page = 1, limit = 15 } = {}) {
    return this.listar({
      filtros: { alvo_id: alvoId },
      page,
      limit,
    });
  }

  listarPorAdministrador(administradorId, { page = 1, limit = 15 } = {}) {
    return this.listar({
      filtros: { administrador_id: administradorId },
      page,
      limit,
    });
  }

  listar({ filtros = {}, page = 1, limit = 15 }) {
    const query = new AdministracaoFilterBuilder()
      .comAdministrador(
        filtros.administrador_id || filtros.administradorId,
      )
      .comTipoAcao(filtros.tipo_acao || filtros.tipoAcao)
      .comTipoAlvo(filtros.tipo_alvo || filtros.tipoAlvo)
      .comAlvo(filtros.alvo_id || filtros.alvoId)
      .comResultadoDenuncia(
        filtros.resultado_denuncia || filtros.resultadoDenuncia,
      )
      .comPeriodo(filtros.dataInicio, filtros.dataFim)
      .build();

    return this.listarComPaginacao(query, {
      page,
      limit,
      sort: { data_acao: -1 },
      populate: [
        { path: "administrador_id", select: "nome email perfil situacao" },
      ],
      include: ALVO_INCLUDE,
    });
  }
}

export default AdministracaoRepository;
