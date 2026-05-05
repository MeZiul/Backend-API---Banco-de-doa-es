import mongoose from "mongoose";
import mongoosePaginate from "mongoose-paginate-v2";

class Interesse {
  constructor() {
    const schema = new mongoose.Schema(
      {
        item_id: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "ItemDoacao",
          required: [true, "A referência ao item de doação é obrigatória."]
        },
        usuario_interessado_id: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Usuario",
          required: [true, "A referência ao usuário que manifestou interesse é obrigatória."]
        },
        usuario_doador_id: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Usuario",
          required: [true, "A referência ao dono do item é obrigatória."]
        },
        mensagem_interessado: {
          type: String,
          trim: true,
          default: null
        },

        resposta_doador: {
          type: String,
          trim: true,
          default: null
        },
        status: {
          type: String,
          enum: ["PENDENTE", "ACEITO", "RECUSADO", "CANCELADO", "EXPIRADO"],
          required: [true, "O status do interesse é obrigatório."],
          default: "PENDENTE"
        },
        data_interesse: {
          type: Date,
          default: Date.now
        },
        data_resposta: {
          type: Date,
          default: null
        },
        data_cancelamento: {
          type: Date,
          default: null
        }
      },
      {
        timestamps: true,
        versionKey: false,
      }
    );

    schema.plugin(mongoosePaginate);
    
    schema.index(
      { item_id: 1, usuario_interessado_id: 1 },
      {
        unique: true,
        partialFilterExpression: {
          status: { $in: ["PENDENTE", "ACEITO"] },
        },
      }
    );

    this.model = mongoose.model("Interesse", schema, "interesses");
  }
}

export default new Interesse().model;
