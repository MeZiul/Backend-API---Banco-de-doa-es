const ItemDoacao = require('../models/ItemDoacao');

module.exports = {
    async criar(req, res) {
        try {
            const item = await ItemDoacao.create(req.body);
            return res.status(201).json(item);
        } catch (error) {
            return res.status(400).json({ erro: "Falha ao criar item", detalhes: error.message });
        }
    },

    async listar(req, res) {
        try {
            const { page = 1, limit = 10 } = req.query;
            const itens = await ItemDoacao.find()
                .limit(limit * 1)
                .skip((page - 1) * limit)
                .sort({ createdAt: -1 });

            return res.json(itens);
        } catch (error) {
            return res.status(500).json({ erro: "Erro ao buscar itens" });
        }
    },

    async adicionarImagem(req, res) {
        try {
            const { id } = req.params;
            const { urlImagem } = req.body;

            if (!urlImagem) {
                return res.status(400).json({ erro: "A URL ou string da imagem é necessária" });
            }

            const item = await ItemDoacao.findByIdAndUpdate(
                id,
                { $push: { imagens: urlImagem } },
                { new: true } // Retorna o objeto já atualizado
            );

            if (!item) return res.status(404).json({ erro: "Item não encontrado" });

            return res.json(item);
        } catch (error) {
            return res.status(500).json({ erro: "Erro ao processar imagem" });
        }
    }
};