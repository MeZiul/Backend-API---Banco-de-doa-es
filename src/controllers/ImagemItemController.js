import ImagemItemService from "../services/ImagemItemService.js";
import {CustomError} from "../utils/helpers/index.js";

class ImagemItemController {

    // Método para adicionar novas fotos a um item
    async upload(req, res) {
        try {
            // Pega o ID item que veio na url
            const { id } = req.params;

            // Chama o Service
            const itemAtualizado = await ImagemItemService.adicionarFotos(
                id,
                req.files,
                req.usuario.id
            );

            // Devolve a resposta de sucesso
            return res.status(200).json({
                mensagem: "Fotos adicionadas com sucesso!",
                fotos: itemAtualizado.fotos
            });

        } catch (error) {
            // Se for um erro de regra de negócio
            if (error instanceof CustomError) {
                return res.status(error.statusCode).json({ erro: error.customMessage });
            }

            // Se for um erro do servidor
            console.error("Erro interno no upload de imagens:", error);
            return res.status(500).json({ erro: "Erro interno ao processar imagens." });
        }
    }
}

export default new ImagemItemController();