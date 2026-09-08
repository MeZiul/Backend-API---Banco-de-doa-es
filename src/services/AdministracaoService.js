import { CustomError, messages } from "../utils/helpers/index.js";
import { REFERENCIAS_NOTIFICACAO, TIPOS_NOTIFICACAO } from "../constants/notificacoes.js";

class AdministracaoService {
    constructor({
        administracaoRepository,
        usuarioRepository,
        itemDoacaoRepository,
        denunciaRepository,
        interesseRepository,
        avaliacaoRepository,
        notificacaoService,
        autenticacaoService = null,
        transactionManager,
    }) {
        this.repository = administracaoRepository;
        this.usuarioRepository = usuarioRepository;
        this.itemDoacaoRepository = itemDoacaoRepository;
        this.denunciaRepository = denunciaRepository;
        this.interesseRepository = interesseRepository;
        this.avaliacaoRepository = avaliacaoRepository;
        this.notificacaoService = notificacaoService;
        this.autenticacaoService = autenticacaoService;
        this.transactionManager = transactionManager;
    }

    async listar({ filtros = {}, page = 1, limit = 15 }, usuario) {
        this.ensureAdmin(usuario);

        return this.repository.listar({
            filtros,
            page: Number(page),
            limit: Number(limit),
        });
    }

    async buscarPorId(id, usuario) {
        this.ensureAdmin(usuario);
        return this.ensureExists(id);
    }

    async listarPorAlvo(alvoId, { page = 1, limit = 15 } = {}, usuario) {
        this.ensureAdmin(usuario);

        return this.repository.listarPorAlvo(alvoId, {
            page: Number(page),
            limit: Number(limit),
        });
    }

    async listarPorAdministrador(administradorId, { page = 1, limit = 15 } = {}, usuario) {
        this.ensureAdmin(usuario);

        return this.repository.listarPorAdministrador(administradorId, {
            page: Number(page),
            limit: Number(limit),
        });
    }

    async listarUsuarios({ filtros = {}, page = 1, limit = 15 }, usuarioAdmin) {
        this.ensureAdmin(usuarioAdmin);

        return this.usuarioRepository.listarParaAdministracao({
            filtros,
            page: Number(page),
            limit: Number(limit),
        });
    }

    async buscarUsuarioPorId(usuarioId, usuarioAdmin) {
        this.ensureAdmin(usuarioAdmin);
        const usuario = await this.usuarioRepository.buscarPorIdParaAdministracao(usuarioId);

        if (!usuario) {
            throw new CustomError({
                statusCode: 404,
                customMessage: messages.error.resourceNotFound("Usuário"),
            });
        }

        const limiteHistorico = 10;
        const [itens, itensDoUsuario] = await Promise.all([
            this.itemDoacaoRepository.listarResumoPorUsuario(usuarioId, limiteHistorico),
            this.itemDoacaoRepository.listarIdsPorUsuario(usuarioId),
        ]);
        const itemIds = itensDoUsuario.map((item) => this.getEntityId(item)).filter(Boolean);
        const [interesses, avaliacoes, denuncias] = await Promise.all([
            this.interesseRepository.listarResumoPorUsuario(usuarioId, limiteHistorico),
            this.avaliacaoRepository.listarResumoPorUsuario(usuarioId, limiteHistorico),
            this.denunciaRepository.listarResumoPorUsuario(usuarioId, itemIds, limiteHistorico),
        ]);
        const dadosUsuario = usuario.toObject?.() ?? usuario;

        return {
            ...dadosUsuario,
            historico: {
                itens,
                interesses,
                avaliacoes,
                denuncias,
            },
        };
    }

    async listarItens({ filtros = {}, page = 1, limit = 15, ordenacao = "recentes" }, usuarioAdmin) {
        this.ensureAdmin(usuarioAdmin);

        return this.itemDoacaoRepository.listarTodos({
            filtros,
            page: Number(page),
            limit: Number(limit),
            ordenacao,
        });
    }

    async listarDenuncias({ filtros = {}, page = 1, limit = 15 }, usuarioAdmin) {
        this.ensureAdmin(usuarioAdmin);

        return this.denunciaRepository.listar({
            filtros,
            page: Number(page),
            limit: Number(limit),
        });
    }

    async bloquearUsuario(usuarioId, dados = {}, usuarioAdmin) {
        this.ensureAdmin(usuarioAdmin);
        this.ensureAlvoDiferenteDoAtor(usuarioId, usuarioAdmin, "bloquear");

        const usuario = await this.ensureUsuarioExists(usuarioId);
        const justificativa = dados.justificativa?.trim?.();

        if (!justificativa) {
            throw new CustomError({
                statusCode: 400,
                customMessage: "A justificativa é obrigatória para bloquear um usuário.",
            });
        }

        if (usuario.situacao !== "ATIVO") {
            throw this.createConflictError("Apenas usuários ativos podem ser bloqueados.");
        }

        const suspensaoAte = dados.suspensao_ate ?? dados.suspensaoAte ?? null;

        const usuarioAtualizado = await this.executarAcaoAuditavel({
            executar: () => this.usuarioRepository.atualizarSeSituacao(usuarioId, "ATIVO", {
                situacao: "SUSPENSO",
                motivo_suspensao: justificativa,
                suspensao_ate: suspensaoAte,
            }),
            auditoria: {
                administrador_id: this.getActorId(usuarioAdmin),
                tipo_acao: "BLOQUEIO_USUARIO",
                tipo_alvo: "USUARIO",
                alvo_id: this.getEntityId(usuario),
                justificativa,
                suspensao_ate: suspensaoAte,
                resposta_administrativa: dados.resposta_administrativa ?? dados.respostaAdministrativa ?? null,
                acao_tomada: dados.acao_tomada ?? dados.acaoTomada ?? "Usuário suspenso.",
            },
            mensagemConflito: "A situação do usuário foi alterada por outra operação.",
        });

        await this.revogarSessoes(usuarioId);

        await this.notificar([
            this.criarNotificacao({
                usuarioId,
                tipo: TIPOS_NOTIFICACAO.USUARIO_SUSPENSO,
                titulo: "Conta suspensa",
                mensagem: `Sua conta foi suspensa. Motivo: ${justificativa}`,
                referenciaTipo: REFERENCIAS_NOTIFICACAO.USUARIO,
                referenciaId: usuarioId,
            }),
        ]);

        return usuarioAtualizado;
    }

    async desbloquearUsuario(usuarioId, dados = {}, usuarioAdmin) {
        this.ensureAdmin(usuarioAdmin);

        const usuario = await this.ensureUsuarioExists(usuarioId);

        if (usuario.situacao !== "SUSPENSO") {
            throw new CustomError({
                statusCode: 400,
                customMessage: "Apenas usuários suspensos podem ser desbloqueados.",
            });
        }

        const usuarioAtualizado = await this.executarAcaoAuditavel({
            executar: () => this.usuarioRepository.atualizarSeSituacao(usuarioId, "SUSPENSO", {
                situacao: "ATIVO",
                motivo_suspensao: null,
                suspensao_ate: null,
            }),
            auditoria: {
                administrador_id: this.getActorId(usuarioAdmin),
                tipo_acao: "DESBLOQUEIO_USUARIO",
                tipo_alvo: "USUARIO",
                alvo_id: this.getEntityId(usuario),
                resposta_administrativa: dados.resposta_administrativa ?? dados.respostaAdministrativa ?? null,
                acao_tomada: dados.acao_tomada ?? dados.acaoTomada ?? "Usuário reativado.",
            },
            mensagemConflito: "A situação do usuário foi alterada por outra operação.",
        });

        await this.notificar([
            this.criarNotificacao({
                usuarioId,
                tipo: TIPOS_NOTIFICACAO.USUARIO_REATIVADO,
                titulo: "Conta reativada",
                mensagem: "Sua conta foi reativada pela administração.",
                referenciaTipo: REFERENCIAS_NOTIFICACAO.USUARIO,
                referenciaId: usuarioId,
            }),
        ]);

        return usuarioAtualizado;
    }

    async inativarUsuario(usuarioId, dados = {}, usuarioAdmin) {
        this.ensureAdmin(usuarioAdmin);
        this.ensureAlvoDiferenteDoAtor(usuarioId, usuarioAdmin, "inativar");

        const usuario = await this.ensureUsuarioExists(usuarioId);

        if (usuario.situacao === "INATIVO") {
            throw this.createConflictError("O usuário já está inativo.");
        }

        const usuarioIdNormalizado = this.getEntityId(usuario);
        const itensEmAndamento = await this.itemDoacaoRepository.buscarEmAndamentoPorUsuario(usuarioIdNormalizado);

        if (itensEmAndamento.length > 0) {
            throw this.createConflictError(
                "O usuário possui doações em andamento e não pode ser inativado automaticamente."
            );
        }

        let resultadoTransacao;

        try {
            resultadoTransacao = await this.transactionManager.run(async () => {
                const itensCancelados = await this.cancelarItensDisponiveisDoUsuario(
                    usuarioIdNormalizado
                );
                const itensEmAndamentoNaTransacao = await this.itemDoacaoRepository
                    .buscarEmAndamentoPorUsuario(usuarioIdNormalizado);

                if (itensEmAndamentoNaTransacao.length > 0) {
                    throw this.createConflictError(
                        "O usuário possui doações em andamento e não pode ser inativado automaticamente."
                    );
                }

                const usuarioInativado = await this.usuarioRepository.atualizarSeSituacao(
                    usuarioId,
                    usuario.situacao,
                    {
                        situacao: "INATIVO",
                        motivo_suspensao: null,
                        suspensao_ate: null,
                    }
                );

                if (!usuarioInativado) {
                    throw this.createConflictError(
                        "A situação do usuário foi alterada por outra operação."
                    );
                }

                await this.registrarAcao({
                    administrador_id: this.getActorId(usuarioAdmin),
                    tipo_acao: "INATIVACAO_USUARIO",
                    tipo_alvo: "USUARIO",
                    alvo_id: usuarioIdNormalizado,
                    resposta_administrativa: dados.resposta_administrativa ?? dados.respostaAdministrativa ?? null,
                    acao_tomada: dados.acao_tomada ?? dados.acaoTomada ?? "Usuário inativado administrativamente.",
                });

                return { usuarioInativado, itensCancelados };
            }, { isolationLevel: "Serializable" });
        } catch (error) {
            if (error?.code === "P2034") {
                throw this.createConflictError(
                    "O estado do usuário ou de suas doações mudou durante a inativação. Tente novamente."
                );
            }

            throw error;
        }

        for (const item of resultadoTransacao.itensCancelados) {
            const interessesAtivos = await this.listarInteressesAtivosDoItem(
                this.getEntityId(item)
            );
            await this.notificarCancelamentoItem(item, interessesAtivos);
        }

        await this.revogarSessoes(usuarioIdNormalizado);

        return resultadoTransacao.usuarioInativado;
    }

    async cancelarItem(itemId, dados = {}, usuarioAdmin) {
        this.ensureAdmin(usuarioAdmin);

        const item = await this.ensureItemExists(itemId);
        if (item.status === "CANCELADO") {
            throw this.createConflictError("O item já está cancelado.");
        }

        const itemAtualizado = await this.executarAcaoAuditavel({
            executar: () => this.itemDoacaoRepository.atualizarSeStatus(itemId, item.status, {
                status: "CANCELADO",
            }),
            auditoria: {
                administrador_id: this.getActorId(usuarioAdmin),
                tipo_acao: "CANCELAMENTO_ITEM",
                tipo_alvo: "ITEM",
                alvo_id: this.getEntityId(item),
                resposta_administrativa: dados.resposta_administrativa ?? dados.respostaAdministrativa ?? null,
                acao_tomada: dados.acao_tomada ?? dados.acaoTomada ?? "Item cancelado administrativamente.",
            },
            mensagemConflito: "O status do item foi alterado por outra operação.",
        });

        const interessesAtivos = await this.listarInteressesAtivosDoItem(itemId);
        await this.notificarCancelamentoItem(item, interessesAtivos);

        return itemAtualizado;
    }

    async resolverDenuncia(denunciaId, dados = {}, usuarioAdmin) {
        this.ensureAdmin(usuarioAdmin);

        const denuncia = await this.ensureDenunciaExists(denunciaId);
        const resultado = dados.resultado_denuncia ?? dados.resultadoDenuncia ?? dados.resultado ?? dados.status;

        if (denuncia.status !== "EM_ANALISE") {
            throw new CustomError({
                statusCode: 400,
                customMessage: "Apenas denúncias em análise podem ser resolvidas.",
            });
        }

        if (!["PROCEDENTE", "IMPROCEDENTE"].includes(resultado)) {
            throw new CustomError({
                statusCode: 400,
                customMessage: "O resultado da denúncia deve ser PROCEDENTE ou IMPROCEDENTE.",
            });
        }

        if (resultado === "PROCEDENTE" && denuncia.tipo_alvo === "USUARIO") {
            this.ensureAlvoDiferenteDoAtor(
                this.getEntityId(denuncia.alvo_usuario_id),
                usuarioAdmin,
                "suspender"
            );
        }

        const actorId = this.getActorId(usuarioAdmin);
        const respostaAdmin = dados.resposta_administrativa ?? dados.respostaAdministrativa ?? dados.resposta_admin ?? dados.respostaAdmin ?? null;
        const acaoTomada = dados.acao_tomada ?? dados.acaoTomada ?? null;
        const denunciaAtualizada = await this.transactionManager.run(async () => {
            const denunciaResolvida = await this.denunciaRepository.atualizarSeStatus(
                denunciaId,
                "EM_ANALISE",
                {
                    status: resultado,
                    admin_id: actorId,
                    resposta_admin: respostaAdmin,
                    acao_tomada: acaoTomada,
                    data_analise: new Date(),
                }
            );

            if (!denunciaResolvida) {
                throw this.createConflictError("A denúncia não está mais em análise.");
            }

            if (resultado === "PROCEDENTE") {
                await this.aplicarAcaoProcedente(denuncia, dados);
            }

            await this.registrarAcao({
                administrador_id: actorId,
                tipo_acao: "RESOLUCAO_DENUNCIA",
                tipo_alvo: "DENUNCIA",
                alvo_id: this.getEntityId(denuncia),
                resultado_denuncia: resultado,
                resposta_administrativa: respostaAdmin,
                acao_tomada: acaoTomada,
            });

            return denunciaResolvida;
        });

        if (resultado === "PROCEDENTE" && denuncia.tipo_alvo === "USUARIO") {
            await this.revogarSessoes(this.getEntityId(denuncia.alvo_usuario_id));
        }

        await this.notificarResultadoDenuncia(denuncia, resultado);

        if (resultado === "PROCEDENTE" && denuncia.tipo_alvo === "ITEM") {
            const interessesAtivos = await this.listarInteressesAtivosDoItem(
                this.getEntityId(denuncia.alvo_item_id)
            );
            await this.notificarCancelamentoItem(denuncia.alvo_item_id, interessesAtivos);
        }

        return denunciaAtualizada;
    }

    async aplicarAcaoProcedente(denuncia, dados) {
        if (denuncia.tipo_alvo === "ITEM") {
            const itemId = this.getEntityId(denuncia.alvo_item_id);
            const item = await this.ensureItemExists(itemId);

            if (item.status === "CANCELADO") {
                return null;
            }

            const itemAtualizado = await this.itemDoacaoRepository.atualizarSeStatus(
                itemId,
                item.status,
                { status: "CANCELADO" }
            );

            if (!itemAtualizado) {
                throw this.createConflictError("O status do item denunciado foi alterado por outra operação.");
            }

            return itemAtualizado;
        }

        if (denuncia.tipo_alvo === "USUARIO") {
            const usuarioId = this.getEntityId(denuncia.alvo_usuario_id);
            const usuario = await this.ensureUsuarioExists(usuarioId);

            if (usuario.situacao !== "ATIVO") {
                return null;
            }

            const motivoSuspensao = dados.acao_tomada ?? dados.acaoTomada ?? "Suspensão por denúncia procedente.";
            const suspensaoAte = dados.suspensao_ate ?? dados.suspensaoAte ?? null;
            const usuarioAtualizado = await this.usuarioRepository.atualizarSeSituacao(usuarioId, "ATIVO", {
                situacao: "SUSPENSO",
                motivo_suspensao: motivoSuspensao,
                suspensao_ate: suspensaoAte,
            });

            if (!usuarioAtualizado) {
                throw this.createConflictError("A situação do usuário denunciado foi alterada por outra operação.");
            }

            return usuarioAtualizado;
        }

        return null;
    }

    async cancelarItensDisponiveisDoUsuario(usuarioId) {
        const itens = await this.itemDoacaoRepository.listarDisponiveisPorUsuario(usuarioId);
        const itensCancelados = [];

        for (const item of itens) {
            const itemId = this.getEntityId(item);
            const itemAtualizado = await this.itemDoacaoRepository.atualizarSeStatus(
                itemId,
                "DISPONIVEL",
                { status: "CANCELADO" }
            );

            if (!itemAtualizado) {
                throw this.createConflictError(
                    "Um item do usuário mudou de status durante a inativação."
                );
            }

            itensCancelados.push(itemAtualizado);
        }

        return itensCancelados;
    }

    async executarAcaoAuditavel({
        executar,
        auditoria,
        mensagemConflito,
    }) {
        return this.transactionManager.run(async () => {
            const resultado = await executar();

            if (!resultado) {
                throw this.createConflictError(mensagemConflito);
            }

            await this.registrarAcao(auditoria);
            return resultado;
        });
    }

    async registrarAcao(dados) {
        return this.repository.criar({
            ...dados,
            alvo_model: this.getAlvoModel(dados.tipo_alvo),
            data_acao: new Date(),
        });
    }

    async revogarSessoes(usuarioId) {
        if (this.autenticacaoService?.revogarSessoesUsuario) {
            await this.autenticacaoService.revogarSessoesUsuario(usuarioId);
        }
    }

    async ensureExists(id) {
        const administracao = await this.repository.buscarPorIdDetalhado(id);

        if (!administracao) {
            throw new CustomError({
                statusCode: 404,
                customMessage: messages.error.resourceNotFound("Administração"),
            });
        }

        return administracao;
    }

    async ensureUsuarioExists(id) {
        const usuario = await this.usuarioRepository.buscarPorId(id);

        if (!usuario) {
            throw new CustomError({
                statusCode: 404,
                customMessage: messages.error.resourceNotFound("Usuário"),
            });
        }

        return usuario;
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

    async ensureDenunciaExists(id) {
        const denuncia = await this.denunciaRepository.buscarPorIdDetalhado(id);

        if (!denuncia) {
            throw new CustomError({
                statusCode: 404,
                customMessage: messages.error.resourceNotFound("Denúncia"),
            });
        }

        return denuncia;
    }

    ensureAdmin(usuario) {
        this.ensureActorAtivo(usuario);
        const papeis = Array.isArray(usuario?.papeis) ? usuario.papeis : [];

        if (usuario?.perfil !== "ADMINISTRADOR" && !papeis.includes("ADMINISTRADOR")) {
            throw new CustomError({
                statusCode: 403,
                customMessage: "Apenas administradores podem realizar esta operação.",
            });
        }
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

    ensureAlvoDiferenteDoAtor(usuarioId, usuarioAdmin, acao) {
        if (usuarioId.toString() === this.getActorId(usuarioAdmin)) {
            throw new CustomError({
                statusCode: 400,
                customMessage: `O administrador não pode ${acao} a própria conta.`,
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

    async listarInteressesAtivosDoItem(itemId) {
        if (!this.interesseRepository?.listarAtivosPorItem) {
            return [];
        }

        try {
            return await this.interesseRepository.listarAtivosPorItem(itemId);
        } catch {
            return [];
        }
    }

    async notificarCancelamentoItem(item, interessesAtivos) {
        const itemId = this.getEntityId(item);
        const tituloItem = item?.titulo ? ` "${item.titulo}"` : "";

        await this.notificar(
            interessesAtivos.map((interesse) => this.criarNotificacao({
                usuarioId: interesse.usuario_interessado_id,
                tipo: TIPOS_NOTIFICACAO.ITEM_CANCELADO,
                titulo: "Item cancelado",
                mensagem: `O item${tituloItem} foi cancelado pela administração.`,
                referenciaTipo: REFERENCIAS_NOTIFICACAO.ITEM,
                referenciaId: itemId,
            }))
        );
    }

    async notificarResultadoDenuncia(denuncia, resultado) {
        const destinatarios = new Set([
            this.getEntityId(denuncia.denunciante_id),
            this.getDestinatarioDenunciado(denuncia),
        ].filter(Boolean));
        const notificacoes = [...destinatarios].map((usuarioId) => this.criarNotificacao({
            usuarioId,
            tipo: TIPOS_NOTIFICACAO.DENUNCIA_RESULTADO,
            titulo: "Denúncia analisada",
            mensagem: `A denúncia foi analisada e considerada ${resultado}.`,
            referenciaTipo: REFERENCIAS_NOTIFICACAO.DENUNCIA,
            referenciaId: denuncia,
        }));

        if (resultado === "PROCEDENTE" && denuncia.tipo_alvo === "USUARIO") {
            notificacoes.push(
                this.criarNotificacao({
                    usuarioId: denuncia.alvo_usuario_id,
                    tipo: TIPOS_NOTIFICACAO.USUARIO_SUSPENSO,
                    titulo: "Conta suspensa",
                    mensagem: "Sua conta foi suspensa após uma denúncia procedente.",
                    referenciaTipo: REFERENCIAS_NOTIFICACAO.USUARIO,
                    referenciaId: denuncia.alvo_usuario_id,
                })
            );
        }

        await this.notificar(notificacoes);
    }

    getDestinatarioDenunciado(denuncia) {
        if (denuncia.tipo_alvo === "USUARIO") {
            return this.getEntityId(denuncia.alvo_usuario_id);
        }

        if (denuncia.tipo_alvo === "ITEM") {
            return this.getEntityId(denuncia.alvo_item_id?.usuario_id);
        }

        return null;
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

    getAlvoModel(tipoAlvo) {
        const modelos = {
            USUARIO: "Usuario",
            ITEM: "ItemDoacao",
            DENUNCIA: "Denuncia",
        };

        return modelos[tipoAlvo];
    }
}

export default AdministracaoService;
