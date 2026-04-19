import DenunciaModel from "../models/Denuncias.js";
import ItemDoacaoModel from "../models/ItemDoacao.js";
import { CustomError, messages } from "../utils/helpers/index.js";

class AdministracaoService {
    constructor({ administracaoRepository, usuarioRepository }) {
        this.repository = administracaoRepository;
        this.usuarioRepository = usuarioRepository;
        this.itemModel = ItemDoacaoModel;
        this.denunciaModel = DenunciaModel;
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

    async bloquearUsuario(usuarioId, dados = {}, usuarioAdmin) {
        this.ensureAdmin(usuarioAdmin);

        const usuario = await this.ensureUsuarioExists(usuarioId);
        const justificativa = dados.justificativa?.trim?.();

        if (!justificativa) {
            throw new CustomError({
                statusCode: 400,
                customMessage: "A justificativa é obrigatória para bloquear um usuário.",
            });
        }

        const usuarioAtualizado = await this.usuarioRepository.atualizar(usuarioId, {
            situacao: "SUSPENSO",
            motivo_suspensao: justificativa,
            suspensao_ate: dados.suspensao_ate ?? dados.suspensaoAte ?? null,
        });

        await this.repository.criar({
            administrador_id: this.getActorId(usuarioAdmin),
            tipo_acao: "BLOQUEIO_USUARIO",
            tipo_alvo: "USUARIO",
            alvo_id: usuario._id,
            justificativa,
            suspensao_ate: dados.suspensao_ate ?? dados.suspensaoAte ?? null,
            resposta_administrativa: dados.resposta_administrativa ?? dados.respostaAdministrativa ?? null,
            acao_tomada: dados.acao_tomada ?? dados.acaoTomada ?? "Usuário suspenso.",
            data_acao: new Date(),
        });

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

        const usuarioAtualizado = await this.usuarioRepository.atualizar(usuarioId, {
            situacao: "ATIVO",
            motivo_suspensao: null,
            suspensao_ate: null,
        });

        await this.repository.criar({
            administrador_id: this.getActorId(usuarioAdmin),
            tipo_acao: "DESBLOQUEIO_USUARIO",
            tipo_alvo: "USUARIO",
            alvo_id: usuario._id,
            resposta_administrativa: dados.resposta_administrativa ?? dados.respostaAdministrativa ?? null,
            acao_tomada: dados.acao_tomada ?? dados.acaoTomada ?? "Usuário reativado.",
            data_acao: new Date(),
        });

        return usuarioAtualizado;
    }

    async inativarUsuario(usuarioId, dados = {}, usuarioAdmin) {
        this.ensureAdmin(usuarioAdmin);

        const usuario = await this.ensureUsuarioExists(usuarioId);

        const usuarioAtualizado = await this.usuarioRepository.atualizar(usuarioId, {
            situacao: "INATIVO",
            motivo_suspensao: null,
            suspensao_ate: null,
        });

        await this.itemModel.updateMany(
            {
                usuario_id: usuario._id,
                status: { $in: ["DISPONIVEL", "RESERVADO", "AGUARDANDO_CONFIRMACAO"] },
            },
            {
                status: "CANCELADO",
            }
        );

        await this.repository.criar({
            administrador_id: this.getActorId(usuarioAdmin),
            tipo_acao: "INATIVACAO_USUARIO",
            tipo_alvo: "USUARIO",
            alvo_id: usuario._id,
            resposta_administrativa: dados.resposta_administrativa ?? dados.respostaAdministrativa ?? null,
            acao_tomada: dados.acao_tomada ?? dados.acaoTomada ?? "Usuário inativado administrativamente.",
            data_acao: new Date(),
        });

        return usuarioAtualizado;
    }

    async cancelarItem(itemId, dados = {}, usuarioAdmin) {
        this.ensureAdmin(usuarioAdmin);

        const item = await this.ensureItemExists(itemId);

        const itemAtualizado = await this.itemModel.findByIdAndUpdate(
            itemId,
            {
                status: "CANCELADO",
            },
            { new: true }
        );

        await this.repository.criar({
            administrador_id: this.getActorId(usuarioAdmin),
            tipo_acao: "CANCELAMENTO_ITEM",
            tipo_alvo: "ITEM",
            alvo_id: item._id,
            resposta_administrativa: dados.resposta_administrativa ?? dados.respostaAdministrativa ?? null,
            acao_tomada: dados.acao_tomada ?? dados.acaoTomada ?? "Item cancelado administrativamente.",
            data_acao: new Date(),
        });

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

        if (resultado === "PROCEDENTE") {
            if (denuncia.tipo_alvo === "ITEM") {
                const itemId = denuncia.alvo_item_id?._id || denuncia.alvo_item_id;
                await this.itemModel.findByIdAndUpdate(itemId, { status: "CANCELADO" });
            }

            if (denuncia.tipo_alvo === "USUARIO") {
                const usuarioId = denuncia.alvo_usuario_id?._id || denuncia.alvo_usuario_id;
                await this.usuarioRepository.atualizar(usuarioId, {
                    situacao: "SUSPENSO",
                    motivo_suspensao: dados.acao_tomada ?? dados.acaoTomada ?? "Suspensão por denúncia procedente.",
                    suspensao_ate: dados.suspensao_ate ?? dados.suspensaoAte ?? null,
                });
            }
        }

        const denunciaAtualizada = await this.denunciaModel.findByIdAndUpdate(
            denunciaId,
            {
                status: resultado,
                admin_id: this.getActorId(usuarioAdmin),
                resposta_admin: dados.resposta_administrativa ?? dados.respostaAdministrativa ?? dados.resposta_admin ?? dados.respostaAdmin ?? null,
                acao_tomada: dados.acao_tomada ?? dados.acaoTomada ?? null,
                data_analise: new Date(),
            },
            { new: true }
        );

        await this.repository.criar({
            administrador_id: this.getActorId(usuarioAdmin),
            tipo_acao: "RESOLUCAO_DENUNCIA",
            tipo_alvo: "DENUNCIA",
            alvo_id: denuncia._id,
            resultado_denuncia: resultado,
            resposta_administrativa: dados.resposta_administrativa ?? dados.respostaAdministrativa ?? dados.resposta_admin ?? dados.respostaAdmin ?? null,
            acao_tomada: dados.acao_tomada ?? dados.acaoTomada ?? null,
            data_acao: new Date(),
        });

        return denunciaAtualizada;
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
        const item = await this.itemModel.findById(id);

        if (!item) {
            throw new CustomError({
                statusCode: 404,
                customMessage: messages.error.resourceNotFound("Item"),
            });
        }

        return item;
    }

    async ensureDenunciaExists(id) {
        const denuncia = await this.denunciaModel.findById(id)
            .populate("alvo_item_id")
            .populate("alvo_usuario_id", "nome email cidade uf situacao");

        if (!denuncia) {
            throw new CustomError({
                statusCode: 404,
                customMessage: messages.error.resourceNotFound("Denúncia"),
            });
        }

        return denuncia;
    }

    ensureAdmin(usuario) {
        if (usuario?.perfil !== "ADMINISTRADOR") {
            throw new CustomError({
                statusCode: 403,
                customMessage: "Apenas administradores podem realizar esta operação.",
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
}

export default AdministracaoService;
