import { CustomError, messages } from "../utils/helpers/index.js";
import { REFERENCIAS_NOTIFICACAO, TIPOS_NOTIFICACAO } from "../constants/notificacoes.js";

class AdministracaoService {
    constructor({
        administracaoRepository,
        usuarioRepository,
        itemDoacaoRepository,
        denunciaRepository,
        interesseRepository,
        notificacaoService,
    }) {
        this.repository = administracaoRepository;
        this.usuarioRepository = usuarioRepository;
        this.itemDoacaoRepository = itemDoacaoRepository;
        this.denunciaRepository = denunciaRepository;
        this.interesseRepository = interesseRepository;
        this.notificacaoService = notificacaoService;
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

        return usuario;
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
            compensar: () => this.usuarioRepository.atualizarSeSituacao(
                usuarioId,
                "SUSPENSO",
                {
                    situacao: usuario.situacao,
                    motivo_suspensao: usuario.motivo_suspensao ?? null,
                    suspensao_ate: usuario.suspensao_ate ?? null,
                },
                {
                    motivo_suspensao: justificativa,
                    suspensao_ate: suspensaoAte,
                }
            ),
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
            mensagemCompensacao: "Falha ao compensar bloqueio sem registro de auditoria.",
        });

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
            compensar: () => this.usuarioRepository.atualizarSeSituacao(
                usuarioId,
                "ATIVO",
                {
                    situacao: "SUSPENSO",
                    motivo_suspensao: usuario.motivo_suspensao ?? null,
                    suspensao_ate: usuario.suspensao_ate ?? null,
                },
                {
                    motivo_suspensao: null,
                    suspensao_ate: null,
                }
            ),
            auditoria: {
                administrador_id: this.getActorId(usuarioAdmin),
                tipo_acao: "DESBLOQUEIO_USUARIO",
                tipo_alvo: "USUARIO",
                alvo_id: this.getEntityId(usuario),
                resposta_administrativa: dados.resposta_administrativa ?? dados.respostaAdministrativa ?? null,
                acao_tomada: dados.acao_tomada ?? dados.acaoTomada ?? "Usuário reativado.",
            },
            mensagemConflito: "A situação do usuário foi alterada por outra operação.",
            mensagemCompensacao: "Falha ao compensar desbloqueio sem registro de auditoria.",
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

        const itensParaNotificar = await this.listarItensCancelaveisComInteresses(usuarioIdNormalizado);
        const itensCancelados = await this.cancelarItensDisponiveisDoUsuario(usuarioIdNormalizado);
        let usuarioAtualizado;

        try {
            usuarioAtualizado = await this.usuarioRepository.atualizarSeSituacao(
                usuarioId,
                usuario.situacao,
                {
                    situacao: "INATIVO",
                    motivo_suspensao: null,
                    suspensao_ate: null,
                }
            );

            if (!usuarioAtualizado) {
                throw this.createConflictError("A situação do usuário foi alterada por outra operação.");
            }

            await this.registrarAcao({
                administrador_id: this.getActorId(usuarioAdmin),
                tipo_acao: "INATIVACAO_USUARIO",
                tipo_alvo: "USUARIO",
                alvo_id: usuarioIdNormalizado,
                resposta_administrativa: dados.resposta_administrativa ?? dados.respostaAdministrativa ?? null,
                acao_tomada: dados.acao_tomada ?? dados.acaoTomada ?? "Usuário inativado administrativamente.",
            });
        } catch (error) {
            const compensacoes = this.criarCompensacoesItens(itensCancelados);

            if (usuarioAtualizado) {
                compensacoes.push(() => this.usuarioRepository.atualizarSeSituacao(
                    usuarioId,
                    "INATIVO",
                    {
                        situacao: usuario.situacao,
                        motivo_suspensao: usuario.motivo_suspensao ?? null,
                        suspensao_ate: usuario.suspensao_ate ?? null,
                    },
                    {
                        motivo_suspensao: null,
                        suspensao_ate: null,
                    }
                ));
            }

            await this.executarCompensacoes(
                compensacoes,
                "Falha ao compensar inativação sem registro de auditoria."
            );
            throw error;
        }

        for (const { item, interessesAtivos } of itensParaNotificar) {
            await this.notificarCancelamentoItem(item, interessesAtivos);
        }

        return usuarioAtualizado;
    }

    async cancelarItem(itemId, dados = {}, usuarioAdmin) {
        this.ensureAdmin(usuarioAdmin);

        const item = await this.ensureItemExists(itemId);
        const interessesAtivos = await this.listarInteressesAtivosDoItem(itemId);

        if (item.status === "CANCELADO") {
            throw this.createConflictError("O item já está cancelado.");
        }

        const itemAtualizado = await this.executarAcaoAuditavel({
            executar: () => this.itemDoacaoRepository.atualizarSeStatus(itemId, item.status, {
                status: "CANCELADO",
            }),
            compensar: () => this.itemDoacaoRepository.atualizarSeStatus(itemId, "CANCELADO", {
                status: item.status,
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
            mensagemCompensacao: "Falha ao compensar cancelamento sem registro de auditoria.",
        });

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

        const interessesAtivos = resultado === "PROCEDENTE" && denuncia.tipo_alvo === "ITEM"
            ? await this.listarInteressesAtivosDoItem(this.getEntityId(denuncia.alvo_item_id))
            : [];

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
        const denunciaAtualizada = await this.denunciaRepository.atualizarSeStatus(
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

        if (!denunciaAtualizada) {
            throw this.createConflictError("A denúncia não está mais em análise.");
        }

        let compensacaoAlvo;

        try {
            if (resultado === "PROCEDENTE") {
                compensacaoAlvo = await this.aplicarAcaoProcedente(denuncia, dados);
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
        } catch (error) {
            const compensacoes = [
                () => this.denunciaRepository.atualizarSeStatus(
                    denunciaId,
                    resultado,
                    {
                        status: "EM_ANALISE",
                        admin_id: denuncia.admin_id?._id ?? denuncia.admin_id ?? null,
                        resposta_admin: denuncia.resposta_admin ?? null,
                        acao_tomada: denuncia.acao_tomada ?? null,
                        data_analise: denuncia.data_analise ?? null,
                    },
                    { admin_id: actorId }
                ),
            ];

            if (compensacaoAlvo) {
                compensacoes.unshift(compensacaoAlvo);
            }

            await this.executarCompensacoes(
                compensacoes,
                "Falha ao compensar resolução de denúncia."
            );
            throw error;
        }

        await this.notificarResultadoDenuncia(denuncia, resultado);

        if (resultado === "PROCEDENTE" && denuncia.tipo_alvo === "ITEM") {
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

            return () => this.itemDoacaoRepository.atualizarSeStatus(
                itemId,
                "CANCELADO",
                { status: item.status }
            );
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

            return () => this.usuarioRepository.atualizarSeSituacao(
                usuarioId,
                "SUSPENSO",
                {
                    situacao: usuario.situacao,
                    motivo_suspensao: usuario.motivo_suspensao ?? null,
                    suspensao_ate: usuario.suspensao_ate ?? null,
                },
                {
                    motivo_suspensao: motivoSuspensao,
                    suspensao_ate: suspensaoAte,
                }
            );
        }

        return null;
    }

    async cancelarItensDisponiveisDoUsuario(usuarioId) {
        const itens = await this.itemDoacaoRepository.listarDisponiveisPorUsuario(usuarioId);
        const itensCancelados = [];

        try {
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

                itensCancelados.push({
                    id: itemId,
                    statusOriginal: "DISPONIVEL",
                });
            }
        } catch (error) {
            await this.executarCompensacoes(
                this.criarCompensacoesItens(itensCancelados),
                "Falha ao compensar cancelamento parcial dos itens do usuário."
            );
            throw error;
        }

        return itensCancelados;
    }

    criarCompensacoesItens(itensCancelados) {
        return itensCancelados.map(({ id, statusOriginal }) => {
            return () => this.itemDoacaoRepository.atualizarSeStatus(
                id,
                "CANCELADO",
                { status: statusOriginal }
            );
        });
    }

    async executarAcaoAuditavel({
        executar,
        compensar,
        auditoria,
        mensagemConflito,
        mensagemCompensacao,
    }) {
        const resultado = await executar();

        if (!resultado) {
            throw this.createConflictError(mensagemConflito);
        }

        try {
            await this.registrarAcao(auditoria);
        } catch (error) {
            await this.executarCompensacoes([compensar], mensagemCompensacao);
            throw error;
        }

        return resultado;
    }

    async executarCompensacoes(compensacoes, mensagemFalha) {
        if (compensacoes.length === 0) {
            return;
        }

        const resultados = await Promise.allSettled(compensacoes.map((compensar) => compensar()));
        const compensacaoIncompleta = resultados.some((resultado) => {
            return resultado.status === "rejected" || resultado.value == null;
        });

        if (compensacaoIncompleta) {
            throw new Error(mensagemFalha);
        }
    }

    async registrarAcao(dados) {
        return this.repository.criar({
            ...dados,
            alvo_model: this.getAlvoModel(dados.tipo_alvo),
            data_acao: new Date(),
        });
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

    async listarItensCancelaveisComInteresses(usuarioId) {
        if (!this.itemDoacaoRepository?.listarPorUsuario) {
            return [];
        }

        const statusCancelaveis = new Set([
            "DISPONIVEL",
            "RESERVADO",
            "AGUARDANDO_CONFIRMACAO",
        ]);
        let itens;

        try {
            itens = await this.itemDoacaoRepository.listarPorUsuario(usuarioId);
        } catch {
            return [];
        }
        const itensCancelaveis = itens.filter((item) => statusCancelaveis.has(item.status));

        return Promise.all(
            itensCancelaveis.map(async (item) => ({
                item,
                interessesAtivos: await this.listarInteressesAtivosDoItem(this.getEntityId(item)),
            }))
        );
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
