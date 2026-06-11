import ItemDoacaoModel from "../models/ItemDoacao.js";
import { CustomError, messages } from "../utils/helpers/index.js";

class DenunciaService {
    constructor({ denunciaRepository, usuarioRepository }) {
        this.repository = denunciaRepository;
        this.usuarioRepository = usuarioRepository;
        this.itemModel = ItemDoacaoModel;
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

        const denuncia = await this.repository.criar(payload);
        return this.repository.buscarPorIdDetalhado(denuncia._id);
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

        const denunciaAtualizada = await this.repository.atualizar(id, {
            motivo: dados.motivo ?? denuncia.motivo,
            descricao: dados.descricao ?? denuncia.descricao,
        });

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

        await this.repository.deletar(id);
    }

    async resolver(id, dados, usuario) {
        this.ensureAdmin(usuario);

        const denuncia = await this.ensureExists(id);
        this.ensureEmAnalise(denuncia, "Somente denúncias em análise podem ser resolvidas.");

        const resultado = dados.status || dados.resultado;

        if (!["PROCEDENTE", "IMPROCEDENTE"].includes(resultado)) {
            throw new CustomError({
                statusCode: 400,
                customMessage: "O resultado da análise deve ser PROCEDENTE ou IMPROCEDENTE.",
            });
        }

        if (resultado === "PROCEDENTE" && denuncia.tipo_alvo === "USUARIO") {
            this.ensureAlvoDiferenteDoAtor(
                this.getEntityId(denuncia.alvo_usuario_id),
                usuario,
                "suspender"
            );
        }

        if (resultado === "PROCEDENTE") {
            await this.aplicarAcaoProcedente(denuncia, dados);
        }

        const denunciaResolvida = await this.repository.atualizar(id, {
            status: resultado,
            admin_id: this.getActorId(usuario),
            resposta_admin: dados.resposta_admin ?? dados.respostaAdmin ?? null,
            acao_tomada: dados.acao_tomada ?? dados.acaoTomada ?? null,
            data_analise: new Date(),
        });

        return this.repository.buscarPorIdDetalhado(denunciaResolvida._id);
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
        const item = await this.itemModel.findById(id);

        if (!item) {
            throw new CustomError({
                statusCode: 404,
                customMessage: messages.error.resourceNotFound("Item"),
            });
        }

        return item;
    }

    async aplicarAcaoProcedente(denuncia, dados) {
        if (denuncia.tipo_alvo === "ITEM") {
            const itemId = denuncia.alvo_item_id?._id || denuncia.alvo_item_id;
            await this.ensureItemExists(itemId);

            await this.itemModel.findByIdAndUpdate(itemId, {
                status: "CANCELADO",
            });

            return;
        }

        if (denuncia.tipo_alvo === "USUARIO") {
            const usuarioId = denuncia.alvo_usuario_id?._id || denuncia.alvo_usuario_id;
            await this.ensureUsuarioExists(usuarioId);

            await this.usuarioRepository.atualizar(usuarioId, {
                situacao: "SUSPENSO",
                motivo_suspensao: dados.acao_tomada ?? dados.acaoTomada ?? "Suspensão por denúncia procedente.",
                suspensao_ate: dados.suspensao_ate ?? dados.suspensaoAte ?? null,
            });
        }
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
}

export default DenunciaService;
