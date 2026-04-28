import mongoose from 'mongoose';
import mongoosePaginate from "mongoose-paginate-v2";

const notificacaoSchema = new mongoose.Schema({
    usuario_id: {
        type: mongoose.Schema.Types.ObjectId,
        re: "Usuario",
        required: true
    },
    tipo: {
        type: String,
        enum: [
            "INTERESE_RECEBIDO",
            "INTERESSE_ACEITO",
            "INTERESSE_RECUSADO",
            "DOACAO_CONFIRMADA",
            "AVALIACAO_RECEBIDA",
            "DENUNCIA_RESULTADO",
            "SISTEMA"
        ],
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

//Mongoose ja retorna o constructor pronto
const Notificacao = mongoose.model("Notificacao", notificacaoSchema);

export default Notificacao;