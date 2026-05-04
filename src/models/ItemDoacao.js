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
                    ref: "Interesse"
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
                    required: true,
                    index: true
                },

                cidade: {
                    type: String,
                    required: true,
                    index: true
                },

                uf: {
                    type: String,
                    minlength: 2,
                    maxlength: 2,
                    required: true,
                    index: true
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
                    index: true // Otimização vital para a listagem
                },

                // Array embutido para as imagens do item (RN-ITEM-002)
                fotos: [
                    {
                        url: {
                            type: String,
                            required: true
                        },
                        ordem: {
                            type: Number,
                            required: true
                        },
                        nome_original: {
                            type: String
                        },
                        tamanho: {
                            type: Number
                        },
                        mime_type: {
                            type: String
                        },
                        data_upload: {
                            type: Date,
                            default: Date.now
                        }
                    }
                ],

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


        // Agiliza a busca principal: Itens DISPONÍVEIS ordenados pelos mais recentes
        schema.index({ status: 1, data_cadastro: -1 });

        // Agiliza a busca alternativa: Itens DISPONÍVEIS ordenados pelos mais visualizados
        schema.index({ status: 1, visualizacoes: -1 });

        schema.plugin(mongoosePaginate);

        this.model = mongoose.model('ItemDoacao', schema, 'itens_doacao');
    }
}

export default new ItemDoacao().model;
