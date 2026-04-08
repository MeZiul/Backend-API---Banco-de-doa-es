import mongoose from "mongoose";
import mongoosePaginate from "mongoose-paginate-v2";

class ItemDoacao {
    constructor() {

        const schema = new mongoose.Schema(
            {
                usuario_id: {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: "Usuario",
                    required: true,
                    index: true
                },

                categoria_id: {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: "categorias",
                    required: true,
                    index: true
                },

                interesse_aceito_id: {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: "interesses"
                },

                titulo: {
                    type: String,
                    required: true
                },

                descricao: {
                    type: String,
                    required: true
                },

                condicao_item: {
                    type: String,
                    enum: ["NOVO", "SEMINOVO", "USADO_BOM", "USADO_REGULAR"],
                    required: true
                },

                cidade: {
                    type: String,
                    required: true
                },

                uf: {
                    type: String,
                    minlength: 2,
                    maxlength: 2,
                    required: true,
                },

                bairro: {
                    type: String
                },

                condicoes_doacao: {
                    type: String,
                },

                status: {
                    type: String,
                    required: true,
                    enum: ["DISPONIVEL", "RESERVADO", "AGUARDANDO_CONFIRMACAO", "DOADO", "CANCELADO"],
                },

                data_doacao: {
                    type: Date
                },

                visualizacoes: {
                    type: Number,
                    default: 0
                },

                total_interesses: {
                    type: Number,
                    default: 0
                }
            },

            {
                timestamps: { createdAt: "data_cadastro", updatedAt: "data_atualizacao" },
                versionKey: false
            }
        );

        schema.plugin(mongoosePaginate);

        this.model = mongoose.model('ItemDoacao', schema);
    }
}

export default new ItemDoacao().model;