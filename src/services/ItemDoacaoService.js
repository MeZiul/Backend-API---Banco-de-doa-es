import { CustomError } from "../utils/helpers/index.js";
import ItemDoacaoRepository from "../repositories/ItemDoacaoRepository.js";

class ItemDoacaoService {
  constructor(itemDoacaoRepository, categoriaRepository, interesseRepository) {
    this.repository = itemDoacaoRepository;
    this.categoriaRepository = categoriaRepository;
    this.interesseRepository = interesseRepository; // Agora a variável existe!
  }

  async criar(dadosItem, usuarioAutenticado) {

    if (usuarioAutenticado.situacao !== "ATIVO") {
      throw new CustomError({
        statusCode: 403,
        customMessage:
          "Apenas usuários com situação ATIVO podem cadastrar itens.",
      });
    }

    if (
      !dadosItem.titulo ||
      !dadosItem.descricao ||
      !dadosItem.categoria_id ||
      !dadosItem.condicao_item
    ) {
      throw new CustomError({
        statusCode: 400,
        customMessage:
          "Título, descrição, categoria e condição do item são obrigatórios.",
      });
    }

    const cidade = dadosItem.cidade || usuarioAutenticado.cidade;
    const uf = dadosItem.uf || usuarioAutenticado.uf;

    const novoItem = {
      ...dadosItem,
      cidade,
      uf,
      usuario_id: usuarioAutenticado.id,
      status: "DISPONIVEL",
      visualizacoes: 0,
      total_interesses: 0,
    };

    return await this.repository.criar(novoItem);
  }

  async listarDisponiveis({ filtros, page, limit, ordenacao }) {
    return await this.repository.listarDisponiveis({
      filtros,
      page,
      limit,
      ordenacao,
    });
  }

  async buscarDetalhes(id) {
    const item = await this.repository.buscarDetalhes(id);
    if (!item) {
      throw new CustomError({
        statusCode: 404,
        customMessage: "Item não encontrado.",
      });
    }
    return item;
  }

  async atualizar(id, dadosAtualizacao, usuarioAutenticadoId) {
    const item = await this.repository.buscarPorId(id);
    if (!item)
      throw new CustomError({
        statusCode: 404,
        customMessage: "Item não encontrado.",
      });

    if (item.usuario_id.toString() !== usuarioAutenticadoId) {
      throw new CustomError({
        statusCode: 403,
        customMessage: "Você não tem permissão para editar este item.",
      });
    }

    if (item.status !== "DISPONIVEL") {
      throw new CustomError({
        statusCode: 400,
        customMessage: `Edição bloqueada. O status atual do item é ${item.status}.`,
      });
    }

    delete dadosAtualizacao.status;
    delete dadosAtualizacao.usuario_id;
    delete dadosAtualizacao.interesse_aceito_id;

    return await this.repository.atualizar(id, dadosAtualizacao);
  }

  async deletar(id, usuarioAutenticadoId) {
    const item = await this.repository.buscarPorId(id);
    if (!item)
      throw new CustomError({
        statusCode: 404,
        customMessage: "Item não encontrado.",
      });

    if (item.usuario_id.toString() !== usuarioAutenticadoId) {
      throw new CustomError({
        statusCode: 403,
        customMessage: "Você não tem permissão para excluir este item.",
      });
    }

    if (
      item.status === "RESERVADO" ||
      item.status === "AGUARDANDO_CONFIRMACAO"
    ) {
      throw new CustomError({
        statusCode: 400,
        customMessage:
          "Não é possível excluir um item que está em processo de doação.",
      });
    }

    return await this.repository.atualizar(id, { status: "CANCELADO" });
  }

  async confirmarEntrega(idItem, usuarioAutenticadoId) {
    const item = await this.repository.buscarPorId(idItem);
    if (!item)
      throw new CustomError({
        statusCode: 404, // Mudei para 404 (Not Found) em vez de 400
        customMessage: "Item não encontrado.",
      });

    if (item.usuario_id.toString() !== usuarioAutenticadoId) {
      throw new CustomError({
        statusCode: 403,
        customMessage: "Apenas o doador pode marcar o item como entregue.",
      });
    }

    if (item.status !== "RESERVADO") {
      throw new CustomError({
        statusCode: 400,
        customMessage:
          "O item precisa estar reservado para ser marcado como entregue.",
      });
    }

    return await this.repository.atualizar(idItem, {
      status: "AGUARDANDO_CONFIRMACAO",
    });
  }

  async confirmarRecebimento(idItem, interessadoAutenticadoId) {
    const item = await this.repository.buscarPorId(idItem, {
      populate: [
        {
          path: "interesse_aceito_id",
          select: "usuario_interessado_id",
        },
      ],
    });

    if (!item) {
      throw new CustomError({
        statusCode: 404,
        customMessage: "Item não encontrado.",
      });
    }

    const interessadoId =
      item.interesse_aceito_id?.usuario_interessado_id?._id?.toString?.()
      ?? item.interesse_aceito_id?.usuario_interessado_id?.toString?.();

    if (interessadoId !== interessadoAutenticadoId) {
      throw new CustomError({
        statusCode: 403,
        customMessage:
          "Você não tem permissão para confirmar o recebimento deste item.",
      });
    }

    if (item.status !== "AGUARDANDO_CONFIRMACAO") {
      throw new CustomError({
        statusCode: 400,
        customMessage:
          "Este item não está aguardando confirmação de recebimento.",
      });
    }

    return await this.repository.atualizar(idItem, {
      status: "DOADO",
      data_doacao: new Date(),
    });
  }

  async cancelarItem(idItem, motivo, usuarioAutenticado) {
    const item = await this.repository.buscarPorId(idItem);
    if (!item) {
      throw new CustomError({
        statusCode: 404,
        customMessage: "Item não encontrado.",
      });
    }

    if (item.usuario_id.toString() !== usuarioAutenticado.id && usuarioAutenticado.perfil !== "ADMINISTRADOR") {
      throw new CustomError({
        statusCode: 403,
        customMessage: "Você não tem permissão para cancelar este item.",
      });
    }

    // Se o item já foi cancelado ou já foi doado, bloqueia
    if (item.status === "CANCELADO" || item.status === "DOADO") {
      throw new CustomError({
        statusCode: 400,
        customMessage: `Não é possível cancelar um item com status ${item.status}.`,
      });
    }

    // Atualiza o status do item para CANCELADO e salva o motivo
    return await this.repository.atualizar(idItem, {
      status: "CANCELADO",
      motivo_cancelamento: motivo
    });
  }

  async listarInteresses(idItem, usuarioAutenticado) {
    const item = await this.repository.buscarPorId(idItem);
    if (!item) {
      throw new CustomError({
        statusCode: 404,
        customMessage: "Item não encontrado.",
      });
    }

    if (item.usuario_id.toString() !== usuarioAutenticado.id) {
      throw new CustomError({
        statusCode: 403,
        customMessage: "Apenas o doador do item pode listar os interessados.",
      });
    }


    const interessados = await this.interesseRepository.listarPorItem(idItem);

    return interessados;
  }
}

export default ItemDoacaoService;
