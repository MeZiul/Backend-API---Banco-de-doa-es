import mongoose from 'mongoose';
import mongoosePaginate from "mongoose-paginate-v2";
import { TIPOS_NOTIFICACAO } from "../constants/notificacoes.js";

const notificacaoSchema = new mongoose.Schema({
    usuario_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Usuario",
        required: true
    },
    tipo: {
        type: String,
        enum: Object.values(TIPOS_NOTIFICACAO),
        required: true
    },
    titulo: {
        type: String,
        required: true
    },
    mensagem: {
        type: String,
        required: true
    },
    lida: {
        type: Boolean,
        default: false
    },
    
    referencia_tipo: {
        type: String,
        required: false
    },
    referencia_id: {
        type: mongoose.Schema.Types.ObjectId,
        required: false,
    }
}, {
    timestamps: { createdAt: 'data_criacao', updatedAt: 'data_atualizacao' },
    versionKey: false
});

//suporte a paginação
notificacaoSchema.plugin(mongoosePaginate);
notificacaoSchema.index({ usuario_id: 1, data_criacao: -1 });
notificacaoSchema.index({ usuario_id: 1, lida: 1 });

//Mongoose ja retorna o constructor pronto
const Notificacao = mongoose.model("Notificacao", notificacaoSchema);

export default Notificacao;
