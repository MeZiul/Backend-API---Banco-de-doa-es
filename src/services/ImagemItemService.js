import ItemDoacaoRepository from "../repositories/ItemDoacaoRepository.js";
import { CustomError } from "../utils/helpers/index.js";
import fs from "fs";
import path from "path";

class ImagemItemService {
    constructor(repository) {
        this.repository = repository;
    }

    async adicionarFotos(idItem, arquivos, usuarioAutenticadoId) {
        if (!arquivos || arquivos.length === 0) {
            throw new CustomError({
                statusCode: 400,
                customMessage:"Nenhuma imagem foi enviada.",
            });
        }

        const item = await this.repository.buscarFotosDoItem(idItem);
        if (!item) {
            this._apagarArquivos(arquivos);
            throw new CustomError({
                statusCode: 404,
                customMessage: "Item não encontrado.",
            });
        }

        if (item.usuario_id.toString() !== usuarioAutenticadoId) {
            this._apagarArquivos(arquivos);
            throw new CustomError({

                statusCode: 403,
                customMessage: "Você não tem permissão para adicionar fotos a este item."
            });
        }

        if (item.status !== "DISPONIVEL") {
            this._apagarArquivos(arquivos);
            throw new CustomError({
                statusCode: 400,
                customMessage: `Não é possível alterar imagens. Status atual: ${item.status}.`
            });
        }

        if (item.fotos.length + arquivos.length > 5) {
            this._apagarArquivos(arquivos);
            throw new CustomError({
                statusCode: 400,
                customMessage: `O item já possui ${item.fotos.length} fotos. O máximo permitido é 5.`
            });
        }

        const ordemInicial = item.fotos.length > 0 ? Math.max(...item.fotos.map(f => f.ordem)) + 1 : 1;

        const novasFotos = arquivos.map((file, index) => ({
            url: `/uploads/itens/${file.filename}`,
            ordem: ordemInicial + index,
            nome_original: file.originalname,
            tamanho: file.size,
            mime_type: file.mimetype
        }));

        return await this.repository.adicionarFotos(idItem, novasFotos);
    }

    _apagarArquivos(arquivos) {
        arquivos.forEach(file => {
            const caminho = path.resolve(file.path);
            if (fs.existsSync(caminho)) {
                fs.unlinkSync(caminho);
            }
        });
    }
}

export default new ImagemItemService(ItemDoacaoRepository);