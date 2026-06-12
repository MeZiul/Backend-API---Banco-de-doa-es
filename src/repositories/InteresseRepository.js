import InteresseModel from "../models/Interesse.js";
import BaseRepository from "./base/BaseRepository.js";
import InteresseFilterBuilder from "./filters/InteresseFilterBuilder.js";

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
            .populate("item_id")
            .populate("usuario_interessado_id", "nome email cidade uf")
            .populate("usuario_doador_id", "nome email cidade uf");
    }

    listarPorItem(itemId) {
        return this.model.find({ item_id: itemId }).sort({ data_interesse: -1 });
    }

    buscarAceitoPorItem(itemId) {
        return this.model.findOne({
            item_id: itemId,
            status: "ACEITO"
        });
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
                { path: "item_id" },
                { path: "usuario_interessado_id", select: "nome email cidade uf" },
                { path: "usuario_doador_id", select: "nome email cidade uf" }
            ]
        });
    }
}

export default InteresseRepository;
