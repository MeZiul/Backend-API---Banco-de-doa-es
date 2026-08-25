import { CustomError, messages } from "../utils/helpers/index.js";
import { REFERENCIAS_NOTIFICACAO, TIPOS_NOTIFICACAO } from "../constants/notificacoes.js";

class DenunciaService {
    constructor({
        denunciaRepository,
        usuarioRepository,
        itemDoacaoRepository,
        notificacaoService,
    }) {
        this.repository = denunciaRepository;
        this.usuarioRepository = usuarioRepository;
        this.itemDoacaoRepository = itemDoacaoRepository;
        this.notificacaoService = notificacaoService;
    }

    async listar({ filtros = {}, page = 1, limit = 15 }, usuario) {
        this.ensureActorAtivo(usuario);
        const usuarioId = this.getActorId(usuario);

        if (!this.isAdmin(usuario)) {
            filtros.denunciante_id = usuarioId;
            delete filtros.denuncianteId;
        }

        return this.repository.listar({
            filtros,
            page: Number(page),
            limit: Number(limit),
        });
    }

    async listarAdmin({ filtros = {}, page = 1, limit = 15 }, usuario) {
        this.ensureAdmin(usuario);

        return this.repository.listar({
            filtros,
            page: Number(page),
            limit: Number(limit),
        });
    }

    async listarEmAnalise({ page = 1, limit = 15 }, usuario) {
        this.ensureAdmin(usuario);

        return this.repository.listarEmAnalise({
            page: Number(page),
            limit: Number(limit),
        });
    }

    async buscarPorId(id, usuario) {
        this.ensureActorAtivo(usuario);
        const denuncia = await this.ensureExists(id);

        if (!this.canAccessDenuncia(denuncia, usuario)) {
            throw new CustomError({
                statusCode: 403,
                customMessage: "Você não tem permissão para visualizar esta denúncia.",
            });
        }

        return denuncia;
    }

    async criar(dados, usuario) {
        this.ensureActorAtivo(usuario);
        const usuarioId = this.getActorId(usuario);
        const denunciante = await this.ensureUsuarioAtivo(usuarioId);
        const tipoAlvo = dados.tipo_alvo || dados.tipoAlvo;

        if (!["ITEM", "USUARIO"].includes(tipoAlvo)) {
            throw new CustomError({
                statusCode: 400,
                customMessage: "O tipo de alvo informado para a denúncia é inválido.",
            });
        }

        const payload = {
            denunciante_id: denunciante._id,
            tipo_alvo: tipoAlvo,
            motivo: dados.motivo,
            descricao: dados.descricao ?? null,
            status: "EM_ANALISE",
            data_denuncia: new Date(),
        };

        if (tipoAlvo === "ITEM") {
            const alvoItemId = dados.alvo_item_id || dados.alvoItemId;
            const item = await this.ensureItemExists(alvoItemId);

            const denunciaEmAnalise = await this.repository.buscarEmAnalisePorItemEDenunciante(
                denunciante._id,
                item._id
            );

            if (denunciaEmAnalise) {
                throw new CustomError({
                    statusCode: 409,
                    customMessage: "Já existe uma denúncia em análise para este item.",
                });
            }

            payload.alvo_item_id = item._id;
            payload.alvo_usuario_id = null;
        }

        if (tipoAlvo === "USUARIO") {
            const alvoUsuarioId = dados.alvo_usuario_id || dados.alvoUsuarioId;
            const alvoUsuario = await this.ensureUsuarioExists(alvoUsuarioId);

            if (this.getEntityId(alvoUsuario) === this.getEntityId(denunciante)) {
                throw new CustomError({
                    statusCode: 400,
                    customMessage: "O usuário não pode denunciar a própria conta.",
                });
            }

            const denunciaEmAnalise = await this.repository.buscarEmAnalisePorUsuarioEDenunciante(
                denunciante._id,
                alvoUsuario._id
            );

            if (denunciaEmAnalise) {
                throw new CustomError({
                    statusCode: 409,
                    customMessage: "Já existe uma denúncia em análise para este usuário.",
                });
            }

            payload.alvo_usuario_id = alvoUsuario._id;
            payload.alvo_item_id = null;
        }

        let denuncia;

        try {
            denuncia = await this.repository.criar(payload);
        } catch (error) {
            if (this.isDuplicateKeyError(error)) {
                throw this.createConflictError(
                    tipoAlvo === "ITEM"
                        ? "Já existe uma denúncia em análise para este item."
                        : "Já existe uma denúncia em análise para este usuário."
                );
            }

            throw error;
        }

        const denunciaDetalhada = await this.repository.buscarPorIdDetalhado(denuncia._id);
        await this.notificarAdministradoresNovaDenuncia(denunciaDetalhada ?? denuncia);

        return denunciaDetalhada;
    }

    async atualizar(id, dados, usuario) {
        this.ensureActorAtivo(usuario);
        const denuncia = await this.ensureExists(id);
        const usuarioId = this.getActorId(usuario);

        if (this.getEntityId(denuncia.denunciante_id) !== usuarioId) {
            throw new CustomError({
                statusCode: 403,
                customMessage: "Apenas o autor da denúncia pode atualizá-la.",
            });
        }

        this.ensureEmAnalise(denuncia, "Somente denúncias em análise podem ser atualizadas.");

        const denunciaAtualizada = await this.repository.atualizarSeStatus(
            id,
            "EM_ANALISE",
            {
                motivo: dados.motivo ?? denuncia.motivo,
                descricao: Object.hasOwn(dados, "descricao")
                    ? dados.descricao
                    : denuncia.descricao,
            },
            { denunciante_id: usuarioId }
        );

        if (!denunciaAtualizada) {
            throw this.createConflictError("A denúncia não está mais disponível para atualização.");
        }

        return this.repository.buscarPorIdDetalhado(denunciaAtualizada._id);
    }

    async deletar(id, usuario) {
        this.ensureActorAtivo(usuario);
        const denuncia = await this.ensureExists(id);
        const usuarioId = this.getActorId(usuario);

        if (this.getEntityId(denuncia.denunciante_id) !== usuarioId) {
            throw new CustomError({
                statusCode: 403,
                customMessage: "Apenas o autor da denúncia pode removê-la.",
            });
        }

        this.ensureEmAnalise(denuncia, "Somente denúncias em análise podem ser removidas.");

        const denunciaRemovida = await this.repository.deletarSeEmAnalise(id, usuarioId);

        if (!denunciaRemovida) {
            throw this.createConflictError("A denúncia não está mais disponível para remoção.");
        }
    }

    async ensureExists(id) {
        const denuncia = await this.repository.buscarPorIdDetalhado(id);

        if (!denuncia) {
            throw new CustomError({
                statusCode: 404,
                customMessage: messages.error.resourceNotFound("Denúncia"),
            });
        }

        return denuncia;
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

    async ensureUsuarioAtivo(id) {
        const usuario = await this.ensureUsuarioExists(id);

        if (usuario.situacao !== "ATIVO") {
            throw new CustomError({
                statusCode: 403,
                customMessage: "Somente usuários ativos podem registrar denúncias.",
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

    ensureEmAnalise(denuncia, mensagem) {
        if (denuncia.status !== "EM_ANALISE") {
            throw new CustomError({
                statusCode: 400,
                customMessage: mensagem,
            });
        }
    }

    canAccessDenuncia(denuncia, usuario) {
        if (this.isAdmin(usuario)) {
            return true;
        }

        const usuarioId = this.getActorId(usuario);
        const denuncianteId = denuncia.denunciante_id?._id?.toString?.()
            ?? denuncia.denunciante_id?.toString?.();

        return usuarioId === denuncianteId;
    }

    ensureAdmin(usuario) {
        this.ensureActorAtivo(usuario);

        if (!this.isAdmin(usuario)) {
            throw new CustomError({
                statusCode: 403,
                customMessage: "Apenas administradores podem realizar esta operação.",
            });
        }
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

    async notificarAdministradoresNovaDenuncia(denuncia) {
        try {
            const administradores = await this.usuarioRepository.listarAdministradoresAtivos();
            const denunciaId = this.getEntityId(denuncia);

            return await this.notificacaoService?.criarNotificacoesComSeguranca?.(
                administradores.map((administrador) => ({
                    usuario_id: this.getEntityId(administrador),
                    tipo: TIPOS_NOTIFICACAO.SISTEMA,
                    titulo: "Nova denúncia recebida",
                    mensagem: "Uma nova denúncia aguarda análise administrativa.",
                    referencia_tipo: REFERENCIAS_NOTIFICACAO.DENUNCIA,
                    referencia_id: denunciaId,
                }))
            ) ?? [];
        } catch {
            return [];
        }
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
}

export default DenunciaService;
