import ItemDoacaoRepository from "../repositories/ItemDoacaoRepository.js";
import { CustomError } from "../utils/helpers/index.js";
import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import { itemUploadsDir } from "../config/uploads.js";
import { canonicalItemImage } from "../utils/itemImage.js";

export class ImagemItemService {
    constructor(repository, directory = itemUploadsDir) {
        this.repository = repository;
        this.directory = directory;
    }

    async adicionarFotos(idItem, arquivos, usuarioAutenticadoId) {
        if (!arquivos?.length || arquivos.length > 5) {
            throw new CustomError({ statusCode: 400, customMessage: "Envie de uma a cinco imagens." });
        }
        const item = await this.repository.buscarPorId(idItem);
        if (!item) throw new CustomError({ statusCode: 404, customMessage: "Item não encontrado." });
        if (String(item.usuario_id) !== String(usuarioAutenticadoId)) {
            throw new CustomError({ statusCode: 403, customMessage: "Você não tem permissão para adicionar fotos a este item." });
        }
        if (item.status !== "DISPONIVEL") {
            throw new CustomError({ statusCode: 400, customMessage: `Não é possível alterar imagens. Status atual: ${item.status}.` });
        }
        if (item.fotos.length + arquivos.length > 5) {
            throw new CustomError({ statusCode: 400, customMessage: "O máximo permitido é 5 fotos por item." });
        }

        // Validate the entire batch before any public file is created.
        const imagens = [];
        for (const arquivo of arquivos) imagens.push(await canonicalItemImage(arquivo));
        const escritos = [];
        try {
            await fs.mkdir(this.directory, { recursive: true });
            const fotos = [];
            for (const [index, imagem] of imagens.entries()) {
                const filename = `${crypto.randomBytes(16).toString("hex")}.${imagem.extension}`;
                const caminho = path.join(this.directory, filename);
                const handle = await fs.open(caminho, "wx");
                escritos.push(caminho);
                try { await handle.writeFile(imagem.buffer); } finally { await handle.close(); }
                fotos.push({ url: `/uploads/itens/${filename}`, nome_original: arquivos[index].originalname,
                    tamanho: imagem.size, mime_type: imagem.mimetype });
            }
            // The repository rechecks authorization, status and count under a database row lock.
            const atualizado = await this.repository.adicionarFotos(idItem, fotos, usuarioAutenticadoId);
            if (!atualizado) throw new CustomError({ statusCode: 404, customMessage: "Item não encontrado." });
            return atualizado;
        } catch (error) {
            await Promise.all(escritos.map(caminho => fs.unlink(caminho).catch(cleanupError => {
                if (cleanupError.code !== "ENOENT") throw cleanupError;
            })));
            throw error;
        }
    }

    async removerFoto(idItem, fotoId, usuarioId) {
        const item = await this.repository.buscarPorId(idItem);
        if (!item) throw new CustomError({ statusCode: 404, customMessage: "Item não encontrado." });
        if (String(item.usuario_id) !== String(usuarioId)) throw new CustomError({ statusCode: 403, customMessage: "Acesso negado." });
        const foto = item.fotos.find(f => String(f._id ?? f.id) === String(fotoId) ||
            f.url === `/uploads/itens/${fotoId}`);
        if (!foto) throw new CustomError({ statusCode: 404, customMessage: "Foto não encontrada no registro do item." });
        const filename = foto.url.slice("/uploads/itens/".length);
        if (!foto.url.startsWith("/uploads/itens/") || !filename || path.basename(filename) !== filename || filename.includes("\\")) {
            throw new CustomError({ statusCode: 400, customMessage: "Caminho de imagem inválido." });
        }
        // Preserve the physical file if database removal fails.
        const atualizado = await this.repository.atualizar(idItem, { $pull: { fotos: { _id: foto._id ?? foto.id } } });
        if (!atualizado) throw new CustomError({ statusCode: 404, customMessage: "Item não encontrado." });
        await fs.unlink(path.join(this.directory, filename)).catch(error => { if (error.code !== "ENOENT") throw error; });
        return atualizado;
    }
}

export default new ImagemItemService(new ItemDoacaoRepository());
