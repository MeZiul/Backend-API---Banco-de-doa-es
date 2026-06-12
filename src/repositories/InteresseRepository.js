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

    listarPendentesDoItemExceto(itemId, interesseId) {
        return this.model.find({
            item_id: itemId,
            status: "PENDENTE",
            _id: { $ne: interesseId }
        });
    }

    listarAtivosPorItem(itemId) {
        return this.model.find({
            item_id: itemId,
            status: { $in: ["PENDENTE", "ACEITO"] }
        });
    }

    recusarPendentesDoItem(itemId, interesseAceitoId, dadosAtualizacao = {}) {
        return this.model.updateMany(
            {
                item_id: itemId,
                status: "PENDENTE",
                _id: { $ne: interesseAceitoId }
            },
            {
                ...dadosAtualizacao,
                status: "RECUSADO"
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
