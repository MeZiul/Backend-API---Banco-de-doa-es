import DenunciaModel from "../models/Denuncia.js";
import BaseRepository from "./base/BaseRepository.js";
import DenunciaFilterBuilder from "./filters/DenunciaFilterBuilder.js";

const DENUNCIA_ITEM_SELECT = "titulo status cidade uf usuario_id";
const DENUNCIA_USUARIO_SELECT = "nome email cidade uf situacao";
const DENUNCIA_ADMIN_SELECT = "nome email";

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
            .populate("denunciante_id", DENUNCIA_USUARIO_SELECT)
            .populate("alvo_item_id", DENUNCIA_ITEM_SELECT)
            .populate("alvo_usuario_id", DENUNCIA_USUARIO_SELECT)
            .populate("admin_id", DENUNCIA_ADMIN_SELECT);
    }

    atualizarSeStatus(id, statusEsperado, dadosAtualizacao, filtrosAdicionais = {}) {
        const status = Array.isArray(statusEsperado)
            ? { $in: statusEsperado }
            : statusEsperado;

        return this.model.findOneAndUpdate(
            {
                _id: id,
                status,
                ...filtrosAdicionais,
            },
            { $set: dadosAtualizacao },
            { new: true, runValidators: true }
        );
    }

    deletarSeEmAnalise(id, denuncianteId) {
        return this.model.findOneAndDelete({
            _id: id,
            denunciante_id: denuncianteId,
            status: "EM_ANALISE",
        });
    }

    listarEmAnalise({ page = 1, limit = 15 } = {}) {
        return this.listar({
            filtros: { status: "EM_ANALISE" },
            page,
            limit
        });
    }

    listarResumoPorUsuario(usuarioId, itemIds = [], limit = 10) {
        const relacionamentos = [
            { denunciante_id: usuarioId },
            { alvo_usuario_id: usuarioId },
        ];

        if (itemIds.length > 0) {
            relacionamentos.push({ alvo_item_id: { $in: itemIds } });
        }

        return this.model.find({ $or: relacionamentos })
            .select("denunciante_id tipo_alvo alvo_item_id alvo_usuario_id motivo status data_denuncia data_analise")
            .populate("alvo_item_id", "titulo status")
            .sort({ data_denuncia: -1 })
            .limit(limit);
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
                { path: "denunciante_id", select: DENUNCIA_USUARIO_SELECT },
                { path: "alvo_item_id", select: DENUNCIA_ITEM_SELECT },
                { path: "alvo_usuario_id", select: DENUNCIA_USUARIO_SELECT },
                { path: "admin_id", select: DENUNCIA_ADMIN_SELECT }
            ]
        });
    }
}

export default DenunciaRepository;
