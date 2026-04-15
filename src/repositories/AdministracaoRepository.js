import AdministracaoModel from "../models/Administracao.js";
import BaseRepository from "./base/BaseRepository.js";

class AdministracaoRepository extends BaseRepository {
    constructor() {
        super(AdministracaoModel);
    }

    buscarPorIdDetalhado(id) {
        return this.model.findById(id)
            .populate("administrador_id", "nome email")
            .populate("alvo_id");
    }

    buscarUltimaAcaoPorAlvo(alvoId) {
        return this.model.findOne({ alvo_id: alvoId }).sort({ data_acao: -1 });
    }

    listarPorAlvo(alvoId, { page = 1, limit = 15 } = {}) {
        return this.listar({
            filtros: { alvo_id: alvoId },
            page,
            limit
        });
    }

    listarPorAdministrador(administradorId, { page = 1, limit = 15 } = {}) {
        return this.listar({
            filtros: { administrador_id: administradorId },
            page,
            limit
        });
    }

    listar({ filtros = {}, page = 1, limit = 15 }) {
        const query = {};

        if (filtros.administrador_id || filtros.administradorId) {
            query.administrador_id = filtros.administrador_id || filtros.administradorId;
        }

        if (filtros.tipo_acao || filtros.tipoAcao) {
            query.tipo_acao = filtros.tipo_acao || filtros.tipoAcao;
        }

        if (filtros.tipo_alvo || filtros.tipoAlvo) {
            query.tipo_alvo = filtros.tipo_alvo || filtros.tipoAlvo;
        }

        if (filtros.alvo_id || filtros.alvoId) {
            query.alvo_id = filtros.alvo_id || filtros.alvoId;
        }

        if (filtros.resultado_denuncia || filtros.resultadoDenuncia) {
            query.resultado_denuncia = filtros.resultado_denuncia || filtros.resultadoDenuncia;
        }

        if (filtros.dataInicio || filtros.dataFim) {
            query.data_acao = {};

            if (filtros.dataInicio) {
                query.data_acao.$gte = new Date(filtros.dataInicio);
            }

            if (filtros.dataFim) {
                const fim = new Date(filtros.dataFim);
                fim.setHours(23, 59, 59, 999);
                query.data_acao.$lte = fim;
            }
        }

        return this.listarComPaginacao(query, {
            page,
            limit,
            sort: { data_acao: -1 },
            populate: [
                { path: "administrador_id", select: "nome email" },
                { path: "alvo_id" }
            ]
        });
    }
}

export default AdministracaoRepository;
