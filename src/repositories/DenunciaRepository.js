import DenunciaModel from "../models/Denuncia.js";
import BaseRepository from "./base/BaseRepository.js";
import DenunciaFilterBuilder from "./filters/DenunciaFilterBuilder.js";

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
        const query = new DenunciaFilterBuilder()
            .comDenunciante(filtros.denunciante_id || filtros.denuncianteId)
            .comTipoAlvo(filtros.tipo_alvo || filtros.tipoAlvo)
            .comAlvoItem(filtros.alvo_item_id || filtros.alvoItemId)
            .comAlvoUsuario(filtros.alvo_usuario_id || filtros.alvoUsuarioId)
            .comMotivo(filtros.motivo)
            .comStatus(filtros.status)
            .comAdmin(filtros.admin_id || filtros.adminId)
            .comPeriodo(filtros.dataInicio, filtros.dataFim)
            .build();

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
