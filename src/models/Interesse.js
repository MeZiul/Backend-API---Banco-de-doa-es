import mongoose from "mongoose";
import mongoosePaginate from "mongoose-paginate-v2";

class Interesse {
  constructor() {
    const INTERESSE_STATUS = [
      "PENDENTE",
      "ACEITO",
      "RECUSADO",
      "CANCELADO",
      "EXPIRADO",
    ];

    const schema = new mongoose.Schema(
      {
        itemId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Item",
          required: [true, "O item do interesse é obrigatório."],
          index: true,
        },
        interessadoId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Usuario",
          required: [true, "O usuário interessado é obrigatório."],
          index: true,
        },
        doadorId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Usuario",
          required: [true, "O doador do item é obrigatório."],
          index: true,
        },
        mensagem: {
          type: String,
          trim: true,
          maxlength: [500, "A mensagem deve ter no máximo 500 caracteres."],
          default: null,
        },
        status: {
          type: String,
          enum: INTERESSE_STATUS,
          default: "PENDENTE",
          index: true,
        },
        respostaDoador: {
          type: String,
          trim: true,
          maxlength: [500, "A resposta do doador deve ter no máximo 500 caracteres."],
          default: null,
        },
        dataManifestacao: {
          type: Date,
          default: Date.now,
          required: true,
        },
        dataRespostaDoador: {
          type: Date,
          default: null,
        },
        dataCancelamento: {
          type: Date,
          default: null,
        },
        dataExpiracao: {
          type: Date,
          default: null,
        },
      },
      {
        versionKey: false,
        timestamps: true,
      }
    );

    schema.index(
      { itemId: 1, interessadoId: 1 },
      {
        unique: true,
        partialFilterExpression: {
          status: { $in: ["PENDENTE", "ACEITO"] },
        },
      }
    );

    schema.path("mensagem").validate(function validateMensagem(value) {
      return value === null || value === undefined || value.trim().length > 0;
    }, "A mensagem não pode ser enviada vazia.");

    schema.path("respostaDoador").validate(function validateResposta(value) {
      return value === null || value === undefined || value.trim().length > 0;
    }, "A resposta do doador não pode ser vazia.");

    schema.plugin(mongoosePaginate);
    this.model = mongoose.model("Interesse", schema);
  }
}

export default new Interesse().model;
