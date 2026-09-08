// src/controllers/ItemDoacaoController.js

import { itemDoacaoService } from "../containers/services.itemDoacao.container.js";
import CommonResponse from "../utils/helpers/CommonResponse.js";

class ItemDoacaoController {
  criar = async (req, res) => {
    try {
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

  cancelarItem = async (req, res) => {
    try {
      const { id } = req.params;

      const { cancelarItemSchema } = await import("../utils/validators/schemas/zod/CancelarItemSchema.js");

      const dadosValidados = cancelarItemSchema.parse(req.body);

      const itemCancelado = await itemDoacaoService.cancelarItem(id, dadosValidados.motivo, req.user);

      return CommonResponse.success(res, itemCancelado);
    } catch (error) {
      // Se o Zod falhar, capturamos e tratamos aqui
      if (error.name === "ZodError") {
        return CommonResponse.error(
            res,
            400,
            "validationError",
            null,
            error.errors.map(e => ({ campo: e.path[0], mensagem: e.message })),
            "Erro de validação nos dados enviados."
        );
      }
      return this._handleError(res, error, "Erro interno ao cancelar o item.");
    }
  };

  listarInteresses = async (req, res) => {
    try {
      const { id } = req.params;

      const interessados = await itemDoacaoService.listarInteresses(id, req.user);

      return CommonResponse.success(res, interessados);
    } catch (error) {
      return this._handleError(res, error, "Erro interno ao listar interesses.");
    }
  };

  _handleError(res, error, defaultServerMessage) {
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

    console.error(`[CONTROLLER ERROR]: ${defaultServerMessage}`, error);

    return CommonResponse.serverError(res, defaultServerMessage);
  }
}

export default new ItemDoacaoController();
