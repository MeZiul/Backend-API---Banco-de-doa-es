// src/controllers/ItemDoacaoController.js
import ItemDoacaoRepository from "../repositories/ItemDoacaoRepository.js";


class ItemDoacaoController {
        async atualizar(req, res) {
        try {
            const { id } = req.params;
            const usuarioAutenticado = req.usuario;

            const itemOriginal = await ItemDoacaoRepository.buscarPorId(id);

            if (!itemOriginal) {
                return res.status(404).json({ erro: "Item não encontrado." });
            }

            if (itemOriginal.usuario_id.toString() !== usuarioAutenticado.id) {
                return res.status(403).json({ erro: "Você não tem permissão para editar este item." });
            }

            if (itemOriginal.status !== "DISPONIVEL") {
                return res.status(400).json({
                    erro: `Não é possível editar o item. O status atual é ${itemOriginal.status}.`
                });
            }

            const { titulo, descricao, categoria_id, condicao_item, condicoes_doacao, cidade, uf } = req.body;
            const dadosAtualizacao = { titulo, descricao, categoria_id, condicao_item, condicoes_doacao, cidade, uf };

            if (req.files && req.files.length > 0) {
                // upload das novas fotos e excluiria as antigas do seu Storage (S3/Disco)
                // Exemplo: dadosAtualizacao.fotos = await ServicoDeImagem.atualizarFotos(req.files);
            }

            const itemAtualizado = await ItemDoacaoRepository.atualizar(id, dadosAtualizacao);

            return res.status(200).json({
                mensagem: "Item atualizado com sucesso!",
                item: itemAtualizado
            });

        } catch (error) {
            console.error("Erro ao atualizar item:", error);
            return res.status(500).json({ erro: "Erro interno ao atualizar o item." });
        }
    }

    async excluir(req, res) {
        try {
            const { id } = req.params;
            const usuarioAutenticado = req.usuario;

            const item = await ItemDoacaoRepository.buscarPorId(id);

            if (!item) {
                return res.status(404).json({ erro: "Item não encontrado." });
            }

            if (item.usuario_id.toString() !== usuarioAutenticado.id) {
                return res.status(403).json({ erro: "Você não tem permissão para excluir este item." });
            }

            if (item.status === "RESERVADO" || item.status === "AGUARDANDO_CONFIRMACAO") {
                return res.status(400).json({
                    erro: "Não é possível excluir um item que está em processo de doação."
                });
            }

            const itemCancelado = await ItemDoacaoRepository.atualizar(id, { status: "CANCELADO" });

            return res.status(200).json({
                mensagem: "Item cancelado e removido das buscas com sucesso.",
                item: itemCancelado
            });

        } catch (error) {
            console.error("Erro ao excluir/cancelar item:", error);
            return res.status(500).json({ erro: "Erro interno ao excluir o item." });
        }
    }
}

export default new ItemDoacaoController();