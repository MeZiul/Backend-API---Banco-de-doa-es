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
                customMessage: "Nenhuma imagem foi enviada.",
            });
        }

        // buscarPorId em vez de buscarFotosDoItem
        const item = await this.repository.buscarPorId(idItem);

        if (!item) {
            this._apagarArquivos(arquivos);
            throw new CustomError({
                statusCode: 404,
                customMessage: "Item não encontrado.",
            });
        }

        // Validação de dono e status
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


        return await this.repository.atualizar(idItem, {
            $push: { fotos: { $each: novasFotos } }
        });
    }

    _apagarArquivos(arquivos) {
        arquivos.forEach(file => {
            const caminho = path.resolve(file.path);
            if (fs.existsSync(caminho)) {
                fs.unlinkSync(caminho);
            }
        });
    }

    async removerFoto(idItem, fotoId, usuarioId) {
        const item = await this.repository.buscarPorId(idItem);

        if (!item) throw new CustomError({ statusCode: 404, customMessage: "Item não encontrado." });
        if (item.usuario_id.toString() !== usuarioId) throw new CustomError({ statusCode: 403, customMessage: "Acesso negado." });

        // 1. Achar a foto no array (tentando pelo nome do arquivo ou pelo ID da foto)
        const foto = item.fotos.find(f => f.url.includes(fotoId) || f._id.toString() === fotoId);

        if (!foto) throw new CustomError({ statusCode: 404, customMessage: "Foto não encontrada no registro do item." });

        // Apaga o arquivo físico
        const nomeArquivoReal = foto.url.split('/').pop();
        const caminhoArquivo = path.resolve(`./uploads/itens/${nomeArquivoReal}`);

        if (fs.existsSync(caminhoArquivo)) {
            fs.unlinkSync(caminhoArquivo);
        }

        // Remover do array no Banco usando o _id ÚNICO da sub-coleção
        return await this.repository.atualizar(idItem, {
            $pull: {
                fotos: { _id: foto._id }
            }
        });
    }
}

export default new ImagemItemService(new ItemDoacaoRepository());