import DenunciaModel from "../models/Denuncias.js";
import BaseRepository from "./base/BaseRepository.js";

class DenunciaRepository extends BaseRepository {
    constructor() {
        super(DenunciaModel);
    }

    buscarEmAnalisePorItemEDenunciante(denuncianteId, alvoItemId) {
        return this.model.findOne({
            denunciante_id: denuncianteId,
            alvo_item_id: alvoItemId,
            status: "EM_ANALISE"
        });
    }

    buscarEmAnalisePorUsuarioEDenunciante(denuncianteId, alvoUsuarioId) {
        return this.model.findOne({
            denunciante_id: denuncianteId,
            alvo_usuario_id: alvoUsuarioId,
            status: "EM_ANALISE"
        });
    }

    buscarPorIdDetalhado(id) {
        return this.model.findById(id)
            .populate("denunciante_id", "nome email cidade uf")
            .populate("alvo_item_id")
            .populate("alvo_usuario_id", "nome email cidade uf situacao")
            .populate("admin_id", "nome email");
    }

    listarEmAnalise({ page = 1, limit = 15 } = {}) {
        return this.listar({
            filtros: { status: "EM_ANALISE" },
            page,
            limit
        });
    }

    listar({ filtros = {}, page = 1, limit = 15 }) {
        const query = {};

        if (filtros.denunciante_id || filtros.denuncianteId) {
            query.denunciante_id = filtros.denunciante_id || filtros.denuncianteId;
        }

        if (filtros.tipo_alvo || filtros.tipoAlvo) {
            query.tipo_alvo = filtros.tipo_alvo || filtros.tipoAlvo;
        }

        if (filtros.alvo_item_id || filtros.alvoItemId) {
            query.alvo_item_id = filtros.alvo_item_id || filtros.alvoItemId;
        }

        if (filtros.alvo_usuario_id || filtros.alvoUsuarioId) {
            query.alvo_usuario_id = filtros.alvo_usuario_id || filtros.alvoUsuarioId;
        }

        if (filtros.motivo) {
            query.motivo = filtros.motivo;
        }

        if (filtros.status) {
            query.status = filtros.status;
        }

        if (filtros.admin_id || filtros.adminId) {
            query.admin_id = filtros.admin_id || filtros.adminId;
        }

        if (filtros.dataInicio || filtros.dataFim) {
            query.data_denuncia = {};

            if (filtros.dataInicio) {
                query.data_denuncia.$gte = new Date(filtros.dataInicio);
            }

            if (filtros.dataFim) {
                const fim = new Date(filtros.dataFim);
                fim.setHours(23, 59, 59, 999);
                query.data_denuncia.$lte = fim;
            }
        }

        return this.listarComPaginacao(query, {
            page,
            limit,
            sort: { data_denuncia: -1 },
            populate: [
                { path: "denunciante_id", select: "nome email cidade uf" },
                { path: "alvo_item_id" },
                { path: "alvo_usuario_id", select: "nome email cidade uf situacao" },
                { path: "admin_id", select: "nome email" }
            ]
        });
    }
}

export default DenunciaRepository;
