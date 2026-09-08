import { CustomError } from "../utils/helpers/index.js";

class AvaliacaoService {

  constructor({ avaliacaoRepository, itemDoacaoRepository, interesseRepository, usuarioRepository }) {
    this.repository             = avaliacaoRepository;
    this.itemDoacaoRepository   = itemDoacaoRepository;
    this.interesseRepository    = interesseRepository;
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

    if (!item.data_doacao) {
      throw new CustomError({
        statusCode: 400,
        customMessage: "A data de conclusão da doação é obrigatória para avaliação.",
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

    await this.ensureUsuarioExists(avaliado_id);
    await this.ensureParticipouDaDoacao(item, { avaliado_id, tipo }, usuarioId);

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

  async deletar(id, usuario) {
    const avaliacao = await this.ensureExists(id);

    if (usuario?.perfil !== "ADMINISTRADOR") {
      this.ensureAutorDaAvaliacao(avaliacao, usuario);
    }

    await this.repository.deletar(id);
    await this._recalcularMedia(avaliacao.avaliado_id);
    return { message: "Avaliação removida com sucesso." };
  }

  async listarPorUsuario({ filtros = {}, page = 1, limit = 20 }, usuario) {
    const usuarioId = usuario?.perfil === "ADMINISTRADOR"
      ? undefined
      : this.getActorId(usuario);

    return this.repository.listar({ filtros, page, limit, usuarioId });
  }

  async buscarPorId(id) {
    return this.ensureExists(id);
  }
  
  async atualizar(id, dados, usuario) {
    const avaliacao = await this.ensureExists(id);
    this.ensureAutorDaAvaliacao(avaliacao, usuario);

    const avaliacaoAtualizada = await this.repository.atualizar(id, dados);

    if (dados.nota !== undefined) {
      await this._recalcularMedia(avaliacao.avaliado_id);
    }

    return avaliacaoAtualizada;
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

  async ensureUsuarioExists(id) {
    const usuario = await this.usuarioRepository.buscarPorId(id);
    if (!usuario) {
      throw new CustomError({
        statusCode: 404,
        customMessage: "Usuário avaliado não encontrado.",
      });
    }
    return usuario;
  }

  async ensureParticipouDaDoacao(item, { avaliado_id, tipo }, usuarioId) {
    const doadorId = this.getEntityId(item.usuario_id);
    const interesse = await this.getInteresseAceito(item);
    const interessadoId = this.getEntityId(interesse.usuario_interessado_id);
    const avaliadorId = this.getEntityId(usuarioId);
    const avaliadoId = this.getEntityId(avaliado_id);

    if (!interessadoId) {
      throw new CustomError({
        statusCode: 400,
        customMessage: "A doação não possui interessado aceito para avaliação.",
      });
    }

    if (tipo === "DOADOR_PARA_INTERESSADO") {
      if (avaliadorId !== doadorId || avaliadoId !== interessadoId) {
        throw new CustomError({
          statusCode: 403,
          customMessage: "Apenas o doador pode avaliar o interessado aceito neste item.",
        });
      }
      return;
    }

    if (avaliadorId !== interessadoId || avaliadoId !== doadorId) {
      throw new CustomError({
        statusCode: 403,
        customMessage: "Apenas o interessado aceito pode avaliar o doador deste item.",
      });
    }
  }

  async getInteresseAceito(item) {
    const interesseAceito = item.interesse_aceito_id;

    if (!interesseAceito) {
      throw new CustomError({
        statusCode: 400,
        customMessage: "A doação não possui interesse aceito vinculado.",
      });
    }

    if (interesseAceito.usuario_interessado_id) {
      if (interesseAceito.status && interesseAceito.status !== "ACEITO") {
        throw new CustomError({
          statusCode: 400,
          customMessage: "Interesse aceito não encontrado para esta doação.",
        });
      }

      return interesseAceito;
    }

    const interesse = await this.interesseRepository.buscarPorIdDetalhado(this.getEntityId(interesseAceito));

    if (!interesse || interesse.status !== "ACEITO") {
      throw new CustomError({
        statusCode: 400,
        customMessage: "Interesse aceito não encontrado para esta doação.",
      });
    }

    return interesse;
  }

  ensureAutorDaAvaliacao(avaliacao, usuario) {
    const usuarioId = this.getActorId(usuario);
    const avaliadorId = this.getEntityId(avaliacao.avaliador_id);

    if (usuarioId !== avaliadorId) {
      throw new CustomError({
        statusCode: 403,
        customMessage: "Apenas o autor da avaliação pode alterar ou remover este registro.",
      });
    }
  }

  getActorId(usuario) {
    const actorId = usuario?.id || usuario?._id;

    if (!actorId) {
      throw new CustomError({
        statusCode: 401,
        customMessage: "Usuário autenticado não informado.",
      });
    }

    return this.getEntityId(actorId);
  }

  getEntityId(entidade) {
    const entityId = entidade?._id ?? entidade;
    return entityId?.toString?.() ?? entityId;
  }
}

export default AvaliacaoService;
