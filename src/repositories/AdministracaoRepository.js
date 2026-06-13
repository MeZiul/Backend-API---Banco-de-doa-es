import AdministracaoModel from "../models/Administracao.js";
import BaseRepository from "./base/BaseRepository.js";
import AdministracaoFilterBuilder from "./filters/AdministracaoFilterBuilder.js";

const ADMINISTRADOR_SELECT = "nome email perfil situacao";
const ALVO_SELECT = "nome email perfil situacao titulo status tipo_alvo motivo";

class AdministracaoRepository extends BaseRepository {
    constructor() {
        super(AdministracaoModel);
    }

    buscarPorIdDetalhado(id) {
        return this.model.findById(id)
            .populate("administrador_id", ADMINISTRADOR_SELECT)
            .populate("alvo_id", ALVO_SELECT);
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
        const query = new AdministracaoFilterBuilder()
            .comAdministrador(filtros.administrador_id || filtros.administradorId)
            .comTipoAcao(filtros.tipo_acao || filtros.tipoAcao)
            .comTipoAlvo(filtros.tipo_alvo || filtros.tipoAlvo)
            .comAlvo(filtros.alvo_id || filtros.alvoId)
            .comResultadoDenuncia(filtros.resultado_denuncia || filtros.resultadoDenuncia)
            .comPeriodo(filtros.dataInicio, filtros.dataFim)
            .build();

        return this.listarComPaginacao(query, {
            page,
            limit,
            sort: { data_acao: -1 },
            populate: [
                { path: "administrador_id", select: ADMINISTRADOR_SELECT },
                { path: "alvo_id", select: ALVO_SELECT }
            ]
        });
    }
}

export default AdministracaoRepository;
