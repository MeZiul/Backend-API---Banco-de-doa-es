import mongoose from "mongoose";
import mongoosePaginate from "mongoose-paginate-v2";

class Denuncias {
  constructor() {
    const DENUNCIA_ALVO_TIPOS = ["ITEM", "USUARIO"];
    const DENUNCIA_MOTIVOS = [
      "CONTEUDO_INAPROPRIADO",
      "ITEM_PROIBIDO",
      "FRAUDE",
      "ASSEDIO",
      "SPAM",
      "OUTRO",
    ];
    const DENUNCIA_STATUS = ["EM_ANALISE", "PROCEDENTE", "IMPROCEDENTE"];

    const schema = new mongoose.Schema(
      {
        denuncianteId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Usuario",
          required: [true, "O denunciante é obrigatório."],
          index: true,
        },
        alvoTipo: {
          type: String,
          enum: DENUNCIA_ALVO_TIPOS,
          required: [true, "O tipo do alvo é obrigatório."],
          index: true,
        },
        alvoId: {
          type: mongoose.Schema.Types.ObjectId,
          required: [true, "O alvo da denúncia é obrigatório."],
          refPath: "alvoModel",
          index: true,
        },
        alvoModel: {
          type: String,
          required: true,
          enum: ["Item", "Usuario"],
        },
        motivo: {
          type: String,
          enum: DENUNCIA_MOTIVOS,
          required: [true, "O motivo da denúncia é obrigatório."],
          index: true,
        },
        descricao: {
          type: String,
          trim: true,
          maxlength: [1000, "A descrição deve ter no máximo 1000 caracteres."],
          default: null,
        },
        status: {
          type: String,
          enum: DENUNCIA_STATUS,
          default: "EM_ANALISE",
          index: true,
        },
        respostaAdministrativa: {
          type: String,
          trim: true,
          maxlength: [
            1000,
            "A resposta administrativa deve ter no máximo 1000 caracteres.",
          ],
          default: null,
        },
        acaoTomada: {
          type: String,
          trim: true,
          maxlength: [500, "A ação tomada deve ter no máximo 500 caracteres."],
          default: null,
        },
        administradorResponsavelId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Usuario",
          default: null,
        },
        dataDenuncia: {
          type: Date,
          default: Date.now,
          required: true,
        },
        dataAnalise: {
          type: Date,
          default: null,
        },
      },
      {
        versionKey: false,
        timestamps: true,
      }
    );

    schema.pre("validate", function syncAlvoModel(next) {
      if (this.alvoTipo === "ITEM") {
        this.alvoModel = "Item";
      }

      if (this.alvoTipo === "USUARIO") {
        this.alvoModel = "Usuario";
      }

      next();
    });

    schema.index(
      { denuncianteId: 1, alvoTipo: 1, alvoId: 1 },
      {
        unique: true,
        partialFilterExpression: {
          status: "EM_ANALISE",
        },
      }
    );

    schema.path("descricao").validate(function validateDescricao(value) {
      return value === null || value === undefined || value.trim().length > 0;
    }, "A descrição não pode ser vazia.");

    schema.path("respostaAdministrativa").validate(function validateResposta(value) {
      return value === null || value === undefined || value.trim().length > 0;
    }, "A resposta administrativa não pode ser vazia.");

    schema.path("acaoTomada").validate(function validateAcaoTomada(value) {
      return value === null || value === undefined || value.trim().length > 0;
    }, "A ação tomada não pode ser vazia.");

    schema.plugin(mongoosePaginate);
    this.model = mongoose.model("Denuncia", schema);
  }
}

export default new Denuncias().model;
