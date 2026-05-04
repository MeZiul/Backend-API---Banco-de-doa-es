import ItemDoacaoModel from "../models/ItemDoacao.js";
import { CustomError, messages } from "../utils/helpers/index.js";

class InteresseService {
    constructor({ interesseRepository, usuarioRepository }) {
        this.repository = interesseRepository;
        this.usuarioRepository = usuarioRepository;
        this.itemModel = ItemDoacaoModel;
    }

    async listar({ filtros = {}, page = 1, limit = 15 }, usuario) {
        const usuarioId = this.getActorId(usuario);

        if (!this.isAdmin(usuario)) {
            filtros.usuario_interessado_id = usuarioId;
            delete filtros.usuarioInteressadoId;
        }

        return this.repository.listar({
            filtros,
            page: Number(page),
            limit: Number(limit),
        });
    }

    async listarRecebidos({ filtros = {}, page = 1, limit = 15 }, usuario) {
        filtros.usuario_doador_id = this.getActorId(usuario);
        delete filtros.usuarioDoadorId;

        return this.repository.listar({
            filtros,
            page: Number(page),
            limit: Number(limit),
        });
    }

    async listarPorItem(itemId, usuario) {
        const item = await this.ensureItemExists(itemId);
        this.ensureDoadorOuAdmin(item, usuario);

        return this.repository.listarPorItem(itemId);
    }

    async buscarPorId(id, usuario) {
        const interesse = await this.ensureExists(id);

        if (!this.canAccessInteresse(interesse, usuario)) {
            throw new CustomError({
                statusCode: 403,
                customMessage: "Você não tem permissão para visualizar este interesse.",
            });
        }

        return interesse;
    }

    async criar(dados, usuario) {
        const usuarioId = this.getActorId(usuario);
        const usuarioAtual = await this.ensureUsuarioAtivo(usuarioId);
        const item = await this.ensureItemExists(dados.item_id || dados.itemId);

        if (item.status !== "DISPONIVEL") {
            throw new CustomError({
                statusCode: 400,
                customMessage: "Só é possível manifestar interesse em itens disponíveis.",
            });
        }

        if (item.usuario_id.toString() === usuarioAtual._id.toString()) {
            throw new CustomError({
                statusCode: 400,
                customMessage: "O usuário não pode manifestar interesse no próprio item.",
            });
        }

        const interesseAtivo = await this.repository.buscarAtivoPorItemEInteressado(
            item._id,
            usuarioAtual._id
        );

        if (interesseAtivo) {
            throw new CustomError({
                statusCode: 409,
                customMessage: "Já existe um interesse ativo deste usuário para este item.",
            });
        }

        const interesse = await this.repository.criar({
            item_id: item._id,
            usuario_interessado_id: usuarioAtual._id,
            usuario_doador_id: item.usuario_id,
            mensagem_interessado: dados.mensagem_interessado ?? dados.mensagemInteressado ?? null,
            status: "PENDENTE",
            data_interesse: new Date(),
        });

        await this.itemModel.findByIdAndUpdate(item._id, {
            $inc: { total_interesses: 1 },
        });

        return this.repository.buscarPorIdDetalhado(interesse._id);
    }

    async aceitar(id, dados = {}, usuario) {
        const interesse = await this.ensureExists(id);
        const item = await this.ensureItemExists(interesse.item_id._id || interesse.item_id);

        this.ensureDoadorOuAdmin(item, usuario, false);

        if (interesse.status !== "PENDENTE") {
            throw new CustomError({
                statusCode: 400,
                customMessage: "Somente interesses pendentes podem ser aceitos.",
            });
        }

        if (item.status !== "DISPONIVEL") {
            throw new CustomError({
                statusCode: 400,
                customMessage: "O item precisa estar disponível para aceitar um interesse.",
            });
        }

        const dataResposta = new Date();

        const interesseAceito = await this.repository.atualizar(id, {
            status: "ACEITO",
            data_resposta: dataResposta,
            resposta_doador: dados.resposta_doador ?? dados.respostaDoador ?? null,
        });

        await this.itemModel.findByIdAndUpdate(item._id, {
            status: "RESERVADO",
            interesse_aceito_id: interesseAceito._id,
        });

        await this.repository.recusarPendentesDoItem(item._id, interesseAceito._id, {
            data_resposta: dataResposta,
        });

        return this.repository.buscarPorIdDetalhado(interesseAceito._id);
    }

    async recusar(id, dados = {}, usuario) {
        const interesse = await this.ensureExists(id);
        const item = await this.ensureItemExists(interesse.item_id._id || interesse.item_id);

        this.ensureDoadorOuAdmin(item, usuario, false);

        if (interesse.status !== "PENDENTE") {
            throw new CustomError({
                statusCode: 400,
                customMessage: "Somente interesses pendentes podem ser recusados.",
            });
        }

        const interesseRecusado = await this.repository.atualizar(id, {
            status: "RECUSADO",
            data_resposta: new Date(),
            resposta_doador: dados.resposta_doador ?? dados.respostaDoador ?? null,
        });

        return this.repository.buscarPorIdDetalhado(interesseRecusado._id);
    }

    async cancelar(id, usuario) {
        const interesse = await this.ensureExists(id);
        const usuarioId = this.getActorId(usuario);

        if (this.getEntityId(interesse.usuario_interessado_id) !== usuarioId) {
            throw new CustomError({
                statusCode: 403,
                customMessage: "Apenas o usuário interessado pode cancelar este interesse.",
            });
        }

        if (!["PENDENTE", "ACEITO"].includes(interesse.status)) {
            throw new CustomError({
                statusCode: 400,
                customMessage: "Somente interesses pendentes ou aceitos podem ser cancelados.",
            });
        }

        const interesseCancelado = await this.repository.atualizar(id, {
            status: "CANCELADO",
            data_cancelamento: new Date(),
        });

        if (interesse.status === "ACEITO") {
            await this.itemModel.findByIdAndUpdate(interesse.item_id._id || interesse.item_id, {
                status: "DISPONIVEL",
                interesse_aceito_id: null,
            });
        }

        return this.repository.buscarPorIdDetalhado(interesseCancelado._id);
    }

    async ensureExists(id) {
        const interesse = await this.repository.buscarPorIdDetalhado(id);

        if (!interesse) {
            throw new CustomError({
                statusCode: 404,
                customMessage: messages.error.resourceNotFound("Interesse"),
            });
        }

        return interesse;
    }

    async ensureItemExists(id) {
        const item = await this.itemModel.findById(id);

        if (!item) {
            throw new CustomError({
                statusCode: 404,
                customMessage: messages.error.resourceNotFound("Item"),
            });
        }

        return item;
    }

    async ensureUsuarioAtivo(id) {
        const usuario = await this.usuarioRepository.buscarPorId(id);

        if (!usuario) {
            throw new CustomError({
                statusCode: 404,
                customMessage: messages.error.resourceNotFound("Usuário"),
            });
        }

        if (usuario.situacao !== "ATIVO") {
            throw new CustomError({
                statusCode: 403,
                customMessage: "Somente usuários ativos podem manifestar interesse.",
            });
        }

        return usuario;
    }

    ensureDoadorOuAdmin(item, usuario, permitirAdmin = true) {
        const usuarioId = this.getActorId(usuario);
        const isOwner = this.getEntityId(item.usuario_id) === usuarioId;

        if (isOwner) {
            return;
        }

        if (permitirAdmin && this.isAdmin(usuario)) {
            return;
        }

        throw new CustomError({
            statusCode: 403,
            customMessage: "Apenas o doador responsável pode realizar esta operação.",
        });
    }

    canAccessInteresse(interesse, usuario) {
        if (this.isAdmin(usuario)) {
            return true;
        }

        const usuarioId = this.getActorId(usuario);
        const interessadoId = interesse.usuario_interessado_id?._id?.toString?.()
            ?? interesse.usuario_interessado_id?.toString?.();
        const doadorId = interesse.usuario_doador_id?._id?.toString?.()
            ?? interesse.usuario_doador_id?.toString?.();

        return usuarioId === interessadoId || usuarioId === doadorId;
    }

    isAdmin(usuario) {
        const papeis = Array.isArray(usuario?.papeis) ? usuario.papeis : [];
        return usuario?.perfil === "ADMINISTRADOR" || papeis.includes("ADMINISTRADOR");
    }

    getActorId(usuario) {
        const actorId = usuario?.id || usuario?._id?.toString?.();

        if (!actorId) {
            throw new CustomError({
                statusCode: 401,
                customMessage: "Usuário autenticado não informado.",
            });
        }

        return actorId.toString();
    }

    getEntityId(entidade) {
        const entityId = entidade?._id ?? entidade;
        return entityId?.toString?.() ?? entityId;
    }
}

export default InteresseService;
