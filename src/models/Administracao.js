import mongoose from "mongoose";
import mongoosePaginate from "mongoose-paginate-v2";

class Administracao {
  constructor() {
    const ADMINISTRACAO_ACOES = [
      "BLOQUEIO_USUARIO",
      "DESBLOQUEIO_USUARIO",
      "INATIVACAO_USUARIO",
      "CANCELAMENTO_ITEM",
      "RESOLUCAO_DENUNCIA",
    ];

    const ADMINISTRACAO_ALVO_TIPOS = ["USUARIO", "ITEM", "DENUNCIA"];

    const schema = new mongoose.Schema(
      {
        administradorId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Usuario",
          required: [true, "O administrador responsável é obrigatório."],
          index: true,
        },
        tipoAcao: {
          type: String,
          enum: ADMINISTRACAO_ACOES,
          required: [true, "O tipo da ação administrativa é obrigatório."],
          index: true,
        },
        alvoTipo: {
          type: String,
          enum: ADMINISTRACAO_ALVO_TIPOS,
          required: [true, "O tipo do alvo é obrigatório."],
          index: true,
        },
        alvoId: {
          type: mongoose.Schema.Types.ObjectId,
          required: [true, "O alvo da ação administrativa é obrigatório."],
          refPath: "alvoModel",
          index: true,
        },
        alvoModel: {
          type: String,
          required: true,
          enum: ["Usuario", "Item", "Denuncia"],
        },
        justificativa: {
          type: String,
          trim: true,
          required: [true, "A justificativa da ação administrativa é obrigatória."],
          maxlength: [1000, "A justificativa deve ter no máximo 1000 caracteres."],
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
        resultado: {
          type: String,
          trim: true,
          maxlength: [100, "O resultado deve ter no máximo 100 caracteres."],
          default: null,
        },
        suspensaoAte: {
          type: Date,
          default: null,
        },
        dataAcao: {
          type: Date,
          default: Date.now,
          required: true,
        },
      },
      {
        timestamps: true,
        versionKey: false,
      }
    );

    schema.pre("validate", function syncAlvoModel(next) {
      if (this.alvoTipo === "USUARIO") {
        this.alvoModel = "Usuario";
      }

      if (this.alvoTipo === "ITEM") {
        this.alvoModel = "Item";
      }

      if (this.alvoTipo === "DENUNCIA") {
        this.alvoModel = "Denuncia";
      }

      next();
    });

    schema.path("justificativa").validate(function validateJustificativa(value) {
      return typeof value === "string" && value.trim().length > 0;
    }, "A justificativa não pode ser vazia.");

    schema.path("respostaAdministrativa").validate(function validateResposta(value) {
      return value === null || value === undefined || value.trim().length > 0;
    }, "A resposta administrativa não pode ser vazia.");

    schema.path("acaoTomada").validate(function validateAcaoTomada(value) {
      return value === null || value === undefined || value.trim().length > 0;
    }, "A ação tomada não pode ser vazia.");

    schema.index({ administradorId: 1, dataAcao: -1 });
    schema.index({ alvoTipo: 1, alvoId: 1, dataAcao: -1 });
    schema.index({ tipoAcao: 1, dataAcao: -1 });

    schema.plugin(mongoosePaginate);
    this.model = mongoose.model("Administracao", schema);
  }
}

export default new Administracao().model;
