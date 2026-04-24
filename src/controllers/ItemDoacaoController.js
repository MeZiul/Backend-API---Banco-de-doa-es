// src/controllers/ItemDoacaoController.js

import ItemDoacaoService from "../services/ItemDoacaoService.js";
import CommonResponse from "../utils/helpers/CommonResponse.js";


class ItemDoacaoController {

    async criar(req, res) {
        try {
            // O req.body já passou pela validação do Zod no middleware
            const itemCriado = await ItemDoacaoService.criar(req.body, req.usuario);

            return CommonResponse.created(res, itemCriado, "Item cadastrado com sucesso!");
        } catch (error) {
            return this._handleError(res, error, "Erro interno ao cadastrar item.");
        }
    }

    async listar(req, res) {
        try {
            // req.query já convertido e validado pelo Zod (ItemDoacaoQuerySchema)
            const { busca, categoria_id, cidade, condicao_item, uf, page, limit, ordenacao } = req.query;

            const filtros = { busca, categoria_id, cidade, condicao_item, uf };

            const resultado = await ItemDoacaoService.listarDisponiveis({
                filtros,
                page,
                limit,
                ordenacao
            });

            return CommonResponse.success(res, resultado);
        } catch (error) {
            return this._handleError(res, error, "Erro interno ao listar itens.");
        }
    }

    async buscarPorId(req, res) {
        try {
            const { id } = req.params;
            const item = await ItemDoacaoService.buscarDetalhes(id);

            return CommonResponse.success(res, item);
        } catch (error) {
            return this._handleError(res, error, "Erro interno ao buscar o item.");
        }
    }

    async atualizar(req, res) {
        try {
            const { id } = req.params;
            // O Service validará se o usuário é o dono e se o status é DISPONIVEL
            const itemAtualizado = await ItemDoacaoService.atualizar(id, req.body, req.usuario.id);

            return CommonResponse.success(res, itemAtualizado, 200, "Item atualizado com sucesso!");
        } catch (error) {
            return this._handleError(res, error, "Erro interno ao atualizar o item.");
        }
    }

    async excluir(req, res) {
        try {
            const { id } = req.params;
            // O Service tratará a mudança de status para CANCELADO e notificações
            const itemCancelado = await ItemDoacaoService.excluir(id, req.usuario.id);

            return CommonResponse.success(res, itemCancelado, 200, "Item cancelado com sucesso.");
        } catch (error) {
            return this._handleError(res, error, "Erro interno ao excluir o item.");
        }
    }

    _handleError(res, error, defaultServerMessage) {
        // Verifica se é um erro operacional disparado propositalmente (ex: validação de negócio)
        if (error.isOperational || error.statusCode) {
            return CommonResponse.error(
                res,
                error.statusCode || 400,
                error.errorType || 'businessLogicError',
                error.field || null,
                error.details || [],
                error.customMessage || error.message
            );
        }

        // Log do erro real no console para depuração do desenvolvedor
        console.error(`[CONTROLLER ERROR]: ${defaultServerMessage}`, error);

        // Resposta genérica 500 para o cliente
        return CommonResponse.serverError(res, defaultServerMessage);
    }
}

export default new ItemDoacaoController();