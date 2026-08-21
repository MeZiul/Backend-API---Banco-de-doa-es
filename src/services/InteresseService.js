import { CustomError, messages } from "../utils/helpers/index.js";
import { REFERENCIAS_NOTIFICACAO, TIPOS_NOTIFICACAO } from "../constants/notificacoes.js";

class InteresseService {
    constructor({
        interesseRepository,
        itemDoacaoRepository,
        usuarioRepository,
        notificacaoService,
        transactionManager,
    }) {
        this.repository = interesseRepository;
        this.itemDoacaoRepository = itemDoacaoRepository;
        this.usuarioRepository = usuarioRepository;
        this.notificacaoService = notificacaoService;
        this.transactionManager = transactionManager;
    }
    async listar({ filtros = {}, page = 1, limit = 15 }, usuario) {
        this.ensureActorAtivo(usuario);
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
        this.ensureActorAtivo(usuario);
        filtros.usuario_doador_id = this.getActorId(usuario);
        delete filtros.usuarioDoadorId;

        return this.repository.listar({
            filtros,
            page: Number(page),
            limit: Number(limit),
        });
    }

    async listarPorItem(itemId, usuario) {
        this.ensureActorAtivo(usuario);
        const item = await this.ensureItemExists(itemId);
        this.ensureDoadorOuAdmin(item, usuario);

        return this.repository.listarPorItem(itemId);
    }

    async buscarPorId(id, usuario) {
        this.ensureActorAtivo(usuario);
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
        this.ensureActorAtivo(usuario);
        const usuarioId = this.getActorId(usuario);
        const usuarioAtual = await this.ensureUsuarioAtivo(usuarioId);
        const item = await this.ensureItemExists(dados.item_id || dados.itemId);

        if (item.status !== "DISPONIVEL") {
            throw new CustomError({
                statusCode: 409,
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

        let interesse;

        try {
            interesse = await this.transactionManager.run(async () => {
                const interesseCriado = await this.repository.criar({
                    item_id: item._id,
                    usuario_interessado_id: usuarioAtual._id,
                    usuario_doador_id: item.usuario_id,
                    mensagem_interessado: dados.mensagem_interessado ?? dados.mensagemInteressado ?? null,
                    status: "PENDENTE",
                    data_interesse: new Date(),
                });
                const itemAtualizado = await this.itemDoacaoRepository
                    .incrementarInteressesSeDisponivel(item._id);

                if (!itemAtualizado) {
                    throw this.createConflictError(
                        "O item não está mais disponível para receber interesses."
                    );
                }

                return interesseCriado;
            });
        } catch (error) {
            if (this.isDuplicateKeyError(error)) {
                throw this.createConflictError(
                    "Já existe um interesse ativo deste usuário para este item."
                );
            }

            throw error;
        }

        await this.notificar([
            this.criarNotificacao({
                usuarioId: item.usuario_id,
                tipo: TIPOS_NOTIFICACAO.INTERESSE_RECEBIDO,
                titulo: "Novo interesse recebido",
                mensagem: `Um usuário demonstrou interesse no item "${item.titulo}".`,
                referenciaTipo: REFERENCIAS_NOTIFICACAO.INTERESSE,
                referenciaId: interesse._id,
            }),
        ]);

        return this.repository.buscarPorIdDetalhado(interesse._id);
    }

    async aceitar(id, dados = {}, usuario) {
        this.ensureActorAtivo(usuario);
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
        let interesseAceito;

        try {
            interesseAceito = await this.transactionManager.run(async () => {
                const itemReservado = await this.itemDoacaoRepository
                    .reservarSeDisponivel(item._id, interesse._id);

                if (!itemReservado) {
                    throw this.createConflictError("O item não está mais disponível para reserva.");
                }

                const interesseAtualizado = await this.repository.atualizarSeStatus(id, "PENDENTE", {
                    status: "ACEITO",
                    data_resposta: dataResposta,
                    resposta_doador: dados.resposta_doador ?? dados.respostaDoador ?? null,
                });

                if (!interesseAtualizado) {
                    throw this.createConflictError("O interesse não está mais pendente.");
                }

                await this.repository.recusarPendentesDoItem(item._id, interesseAtualizado._id, {
                    data_resposta: dataResposta,
                });

                return interesseAtualizado;
            });
        } catch (error) {
            if (this.isDuplicateKeyError(error)) {
                throw this.createConflictError("Outro interesse já foi aceito para este item.");
            }

            throw error;
        }

        const outrosRecusados = await this.listarRecusadosParaNotificacao(
            item._id,
            interesseAceito._id,
            dataResposta
        );

        await this.notificar([
            this.criarNotificacao({
                usuarioId: interesse.usuario_interessado_id,
                tipo: TIPOS_NOTIFICACAO.INTERESSE_ACEITO,
                titulo: "Interesse aceito",
                mensagem: `Seu interesse no item "${item.titulo}" foi aceito.`,
                referenciaTipo: REFERENCIAS_NOTIFICACAO.INTERESSE,
                referenciaId: interesseAceito._id,
            }),
            ...outrosRecusados.map((outroInteresse) => this.criarNotificacao({
                usuarioId: outroInteresse.usuario_interessado_id,
                tipo: TIPOS_NOTIFICACAO.INTERESSE_RECUSADO,
                titulo: "Interesse recusado",
                mensagem: `Outro interessado foi selecionado para o item "${item.titulo}".`,
                referenciaTipo: REFERENCIAS_NOTIFICACAO.INTERESSE,
                referenciaId: outroInteresse._id,
            })),
        ]);

        return this.repository.buscarPorIdDetalhado(interesseAceito._id);
    }

    async recusar(id, dados = {}, usuario) {
        this.ensureActorAtivo(usuario);
        const interesse = await this.ensureExists(id);
        const item = await this.ensureItemExists(interesse.item_id._id || interesse.item_id);

        this.ensureDoadorOuAdmin(item, usuario, false);

        if (interesse.status !== "PENDENTE") {
            throw new CustomError({
                statusCode: 400,
                customMessage: "Somente interesses pendentes podem ser recusados.",
            });
        }

        const interesseRecusado = await this.repository.atualizarSeStatus(id, "PENDENTE", {
            status: "RECUSADO",
            data_resposta: new Date(),
            resposta_doador: dados.resposta_doador ?? dados.respostaDoador ?? null,
        });

        if (!interesseRecusado) {
            throw this.createConflictError("O interesse não está mais pendente.");
        }

        await this.notificar([
            this.criarNotificacao({
                usuarioId: interesse.usuario_interessado_id,
                tipo: TIPOS_NOTIFICACAO.INTERESSE_RECUSADO,
                titulo: "Interesse recusado",
                mensagem: `Seu interesse no item "${item.titulo}" foi recusado.`,
                referenciaTipo: REFERENCIAS_NOTIFICACAO.INTERESSE,
                referenciaId: interesseRecusado._id,
            }),
        ]);

        return this.repository.buscarPorIdDetalhado(interesseRecusado._id);
    }

    async cancelar(id, usuario) {
        this.ensureActorAtivo(usuario);
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

        if (interesse.status === "ACEITO") {
            return this.cancelarAceito(interesse);
        }

        const interesseCancelado = await this.repository.atualizarSeStatus(id, "PENDENTE", {
            status: "CANCELADO",
            data_cancelamento: new Date(),
        });

        if (!interesseCancelado) {
            throw this.createConflictError("O interesse não está mais pendente.");
        }

        return this.repository.buscarPorIdDetalhado(interesseCancelado._id);
    }

    async cancelarAceito(interesse) {
        const itemId = interesse.item_id._id || interesse.item_id;
        const interesseCancelado = await this.transactionManager.run(async () => {
            const itemLiberado = await this.itemDoacaoRepository
                .liberarReservaDoInteresse(itemId, interesse._id);

            if (!itemLiberado) {
                throw this.createConflictError(
                    "A reserva do item não corresponde mais a este interesse."
                );
            }

            const interesseAtualizado = await this.repository.atualizarSeStatus(
                interesse._id,
                "ACEITO",
                {
                    status: "CANCELADO",
                    data_cancelamento: new Date(),
                }
            );

            if (!interesseAtualizado) {
                throw this.createConflictError("O interesse não está mais aceito.");
            }

            return interesseAtualizado;
        });

        await this.notificar([
            this.criarNotificacao({
                usuarioId: interesse.usuario_doador_id,
                tipo: TIPOS_NOTIFICACAO.INTERESSE_CANCELADO,
                titulo: "Interesse aceito cancelado",
                mensagem: "O interessado selecionado cancelou o interesse. O item voltou a ficar disponível.",
                referenciaTipo: REFERENCIAS_NOTIFICACAO.INTERESSE,
                referenciaId: interesseCancelado._id,
            }),
        ]);

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
        const item = await this.itemDoacaoRepository.buscarPorId(id);

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

    isDuplicateKeyError(error) {
        return error?.code === 11000;
    }

    createConflictError(customMessage) {
        return new CustomError({
            statusCode: 409,
            customMessage,
        });
    }

    ensureActorAtivo(usuario) {
        if (usuario?.situacao && usuario.situacao !== "ATIVO") {
            throw new CustomError({
                statusCode: 403,
                customMessage: "Somente usuários ativos podem realizar operações protegidas.",
            });
        }

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

    criarNotificacao({ usuarioId, tipo, titulo, mensagem, referenciaTipo, referenciaId }) {
        return {
            usuario_id: this.getEntityId(usuarioId),
            tipo,
            titulo,
            mensagem,
            referencia_tipo: referenciaTipo,
            referencia_id: this.getEntityId(referenciaId),
        };
    }

    async listarRecusadosParaNotificacao(itemId, interesseId, dataResposta) {
        try {
            return await this.repository.listarRecusadosDoAceite(itemId, interesseId, dataResposta);
        } catch {
            return [];
        }
    }

    async notificar(notificacoes) {
        if (notificacoes.length === 0) {
            return [];
        }

        try {
            return await this.notificacaoService?.criarNotificacoesComSeguranca?.(notificacoes);
        } catch {
            return [];
        }
    }
}

export default InteresseService;
