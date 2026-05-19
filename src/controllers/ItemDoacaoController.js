// src/controllers/ItemDoacaoController.js

import { itemDoacaoService } from "../containers/services.itemDoacao.container.js";
import CommonResponse from "../utils/helpers/CommonResponse.js";

class ItemDoacaoController {
  criar = async (req, res) => {
    try {
      // O req.body já passou pela validação do Zod no middleware
      const itemCriado = await itemDoacaoService.criar(req.body, req.user);

      return CommonResponse.created(
        res,
        itemCriado,
        "Item cadastrado com sucesso!",
      );
    } catch (error) {
      return this._handleError(res, error, "Erro interno ao cadastrar item.");
    }
  };

  listar = async (req, res) => {
    try {
      // req.query já convertido e validado pelo Zod (ItemDoacaoQuerySchema)
      const {
        busca,
        categoria_id,
        cidade,
        condicao_item,
        uf,
        page,
        limit,
        ordenacao,
      } = req.query;

      const filtros = { busca, categoria_id, cidade, condicao_item, uf };

      const resultado = await itemDoacaoService.listarDisponiveis({
        filtros,
        page,
        limit,
        ordenacao,
      });

      return CommonResponse.success(res, resultado);
    } catch (error) {
      // Agora o 'this' estará disponível aqui dentro!
      return this._handleError(res, error, "Erro interno ao listar itens.");
    }
  };

  buscarPorId = async (req, res) => {
    try {
      const { id } = req.params;
      const item = await itemDoacaoService.buscarDetalhes(id);
      return CommonResponse.success(res, item);
    } catch (error) {
      return this._handleError(res, error, "Erro interno ao buscar o item.");
    }
  };

  atualizar = async (req, res) => {
    try {
      const { id } = req.params;
      const itemAtualizado = await itemDoacaoService.atualizar(
        id,
        req.body,
        req.user.id,
      );
      return CommonResponse.success(
        res,
        itemAtualizado,
        200,
        "Item atualizado com sucesso!",
      );
    } catch (error) {
      return this._handleError(res, error, "Erro interno ao atualizar o item.");
    }
  };

  deletar = async (req, res) => {
    try {
      const { id } = req.params;
      const itemCancelado = await itemDoacaoService.deletar(id, req.user.id);
      return CommonResponse.success(
        res,
        itemCancelado,
        200,
        "Item cancelado com sucesso.",
      );
    } catch (error) {
      return this._handleError(res, error, "Erro interno ao excluir o item.");
    }
  };
  confirmarEntrega = async (req, res) => {
    try {
      const { id } = req.params;
      const item = await itemDoacaoService.confirmarEntrega(id, req.user.id);
      return CommonResponse.success(
        res,
        item,
      );
    } catch (error) {
      return this._handleError(
        res,
        error,
        "Erro interno ao confirmar entrega.",
      );
    }
  };

  confirmarRecebimento = async (req, res) => {
    try {
      const { id } = req.params;
      const item = await itemDoacaoService.confirmarRecebimento(
        id,
        req.user.id,
      );
      return CommonResponse.success(
        res,
        item,
      );
    } catch (error) {
      return this._handleError(
        res,
        error,
        "Erro interno ao confirmar recebimento.",
      );
    }
  };

  _handleError(res, error, defaultServerMessage) {
    // Verifica se é um erro operacional disparado propositalmente (ex: validação de negócio)
    if (error.isOperational || error.statusCode) {
      return CommonResponse.error(
        res,
        error.statusCode || 400,
        error.errorType || "businessLogicError",
        error.field || null,
        error.details || [],
        error.customMessage || error.message,
      );
    }

    // Log do erro real no console para depuração do desenvolvedor
    console.error(`[CONTROLLER ERROR]: ${defaultServerMessage}`, error);

    // Resposta genérica 500 para o cliente
    return CommonResponse.serverError(res, defaultServerMessage);
  }
}

export default new ItemDoacaoController();
