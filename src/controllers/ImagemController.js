const Imagem = require('../models/Imagem');
const ItemDoacao = require('../models/ItemDoacao');

module.exports = {
    async adicionarImagem(req, res) {
        try {
            const { itemDoacaoId, nome, url, tipo } = req.body;
            const item = await ItemDoacao.findById(itemDoacaoId);
            if (!item){
                return res.status(404).json({ erro: "Item de doação não encontrado" });

            }
            const novaImagem = await Imagem.create({
                nome,
                url,
                tipo,
                itemDoacaoId
            });
            await ItemDoacao.findByIdAndUpdate(itemDoacaoId, {
                $push: { imagem: url}
            });
            return res.status(201).json(novaImagem);
        } catch (error) {
            return res.status(400).json({ erro: "Falha ao adicionar imagem", detalhes: error.message });
        }
    },

    async excluirImagem(req, res) {
        try {
            const {id} = req.params;
            const imagem = await Imagem.findByIdAndDelete(id);

            if (!imagem) return res.status(404).json({ erro: "Imagem não encontrada" });
            return res.status({mensagem: "Imagem removida com sucesso"});
        } catch (error) {
            return res.status(500).json({ erro: "Erro ao excluir imagem" });
        }
    }
};