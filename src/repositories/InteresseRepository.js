import InteresseModel from "../models/Interesse.js";
import BaseRepository from "./base/BaseRepository.js";
import InteresseFilterBuilder from "./filters/InteresseFilterBuilder.js";

const INTERESSE_ITEM_SELECT = "titulo status cidade uf total_interesses";
const INTERESSE_USUARIO_SELECT = "nome email cidade uf";

class InteresseRepository extends BaseRepository {
    constructor() {
        super(InteresseModel);
    }

    buscarAtivoPorItemEInteressado(itemId, usuarioInteressadoId) {
        return this.model.findOne({
            item_id: itemId,
            usuario_interessado_id: usuarioInteressadoId,
            status: { $in: ["PENDENTE", "ACEITO"] }
        });
    }

    buscarPorIdDetalhado(id) {
        return this.model.findById(id)
            .populate("item_id", INTERESSE_ITEM_SELECT)
            .populate("usuario_interessado_id", INTERESSE_USUARIO_SELECT)
            .populate("usuario_doador_id", INTERESSE_USUARIO_SELECT);
    }

    listarPorItem(itemId) {
        return this.model.find({ item_id: itemId })
            .populate("usuario_interessado_id", INTERESSE_USUARIO_SELECT)
            .populate("usuario_doador_id", INTERESSE_USUARIO_SELECT)
            .sort({ data_interesse: -1 });
    }

    buscarAceitoPorItem(itemId) {
        return this.model.findOne({
            item_id: itemId,
            status: "ACEITO"
        });
    }

    listarRecusadosDoAceite(itemId, interesseId, dataResposta) {
        return this.model.find({
            item_id: itemId,
            status: "RECUSADO",
            data_resposta: dataResposta,
            _id: { $ne: interesseId }
        });
    }

    listarAtivosPorItem(itemId) {
        return this.model.find({
            item_id: itemId,
            status: { $in: ["PENDENTE", "ACEITO"] }
        });
    }

    listarResumoPorUsuario(usuarioId, limit = 10) {
        return this.model.find({
            $or: [
                { usuario_interessado_id: usuarioId },
                { usuario_doador_id: usuarioId },
            ],
        })
            .select("item_id usuario_interessado_id usuario_doador_id status data_interesse data_resposta data_cancelamento")
            .populate("item_id", "titulo status")
            .sort({ data_interesse: -1 })
            .limit(limit);
    }

    atualizarSeStatus(id, statusEsperado, dadosAtualizacao) {
        const status = Array.isArray(statusEsperado)
            ? { $in: statusEsperado }
            : statusEsperado;

        return this.model.findOneAndUpdate(
            { _id: id, status },
            { $set: dadosAtualizacao },
            { new: true, runValidators: true }
        );
    }

    recusarPendentesDoItem(itemId, interesseAceitoId, dadosAtualizacao = {}) {
        return this.model.updateMany(
            {
                item_id: itemId,
                status: "PENDENTE",
                _id: { $ne: interesseAceitoId }
            },
            {
                $set: {
                    ...dadosAtualizacao,
                    status: "RECUSADO"
                }
            }
        );
    }

    restaurarRecusadosDoAceite(itemId, interesseAceitoId, dataResposta) {
        return this.model.updateMany(
            {
                item_id: itemId,
                status: "RECUSADO",
                data_resposta: dataResposta,
                _id: { $ne: interesseAceitoId }
            },
            {
                $set: {
                    status: "PENDENTE",
                    data_resposta: null
                }
            }
        );
    }

    listar({ filtros = {}, page = 1, limit = 15 }) {
        const builder = new InteresseFilterBuilder()
            .comItem(filtros.item_id || filtros.itemId)
            .comUsuarioInteressado(filtros.usuario_interessado_id || filtros.usuarioInteressadoId)
            .comUsuarioDoador(filtros.usuario_doador_id || filtros.usuarioDoadorId)
            .comStatus(filtros.status)
            .comPeriodo(filtros.dataInicio, filtros.dataFim);

        return this.listarComPaginacao(builder.build(), {
            page,
            limit,
            sort: { data_interesse: -1 },
            populate: [
                { path: "item_id", select: INTERESSE_ITEM_SELECT },
                { path: "usuario_interessado_id", select: INTERESSE_USUARIO_SELECT },
                { path: "usuario_doador_id", select: INTERESSE_USUARIO_SELECT }
            ]
        });
    }
}

export default InteresseRepository;
