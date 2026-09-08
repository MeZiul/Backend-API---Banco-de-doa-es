import ImagemItemService from "../services/ImagemItemService.js";
import { CustomError } from "../utils/helpers/index.js";

class ImagemItemController {

  upload = async (req, res) => {
    try {
      const { id } = req.params;

      if (!req.user) {
        throw new CustomError({
          statusCode: 401,
          customMessage: "Usuário não autenticado.",
        });
      }

      const itemAtualizado = await ImagemItemService.adicionarFotos(
        id,
        req.files,
        req.user.id,
      );

      return res.status(200).json({
        mensagem: "Fotos adicionadas com sucesso!",
        fotos: itemAtualizado.fotos,
      });
    } catch (error) {
      if (error instanceof CustomError) {
        return res.status(error.statusCode).json({ erro: error.customMessage });
      }
      console.error("Erro interno no upload de imagens:", error);
      return res
        .status(500)
        .json({ erro: "Erro interno ao processar imagens." });
    }
  };

  // excluir uma foto específica
  deletar = async (req, res) => {
    try {
      const { id, fotoId } = req.params; // Pega o ID do item e o ID/Nome da foto

      if (!req.user) {
        throw new CustomError({
          statusCode: 401,
          customMessage: "Usuário não autenticado.",
        });
      }

      const itemAtualizado = await ImagemItemService.removerFoto(
        id,
        fotoId,
        req.user.id,
      );

      return res.status(200).json({
        mensagem: "Foto removida com sucesso!",
        fotos: itemAtualizado.fotos,
      });
    } catch (error) {
      if (error instanceof CustomError) {
        return res.status(error.statusCode).json({ erro: error.customMessage });
      }
      console.error("Erro ao excluir imagem:", error);
      return res.status(500).json({ erro: "Erro interno ao excluir imagem." });
    }
  };
}

export default new ImagemItemController();
