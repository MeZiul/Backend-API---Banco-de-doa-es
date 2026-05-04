import mongoose from "mongoose";
import mongoosePaginate from "mongoose-paginate-v2";

class Administracao {
  constructor() {
    const schema = new mongoose.Schema(
      {
        administrador_id: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Usuario",
          required: [true, "A referência ao administrador responsável é obrigatória."]
        },
        tipo_acao: {
          type: String,
          enum: [
            "BLOQUEIO_USUARIO",
            "DESBLOQUEIO_USUARIO",
            "INATIVACAO_USUARIO",
            "CANCELAMENTO_ITEM",
            "RESOLUCAO_DENUNCIA"
          ],
          required: [true, "O tipo da ação administrativa é obrigatório."]
        },
        tipo_alvo: {
          type: String,
          enum: ["USUARIO", "ITEM", "DENUNCIA"],
          required: [true, "O tipo do alvo é obrigatório."]
        },
        alvo_id: {
          type: mongoose.Schema.Types.ObjectId,
          required: [true, "A referência ao alvo da ação administrativa é obrigatória."],
          refPath: "alvo_model"
        },
        alvo_model: {
          type: String,
          enum: ["Usuario", "ItemDoacao", "Denuncia"],
          required: true
        },
        justificativa: {
          type: String,
          trim: true,
          required: [
            function () {
              return this.tipo_acao === "BLOQUEIO_USUARIO";
            },
            "A justificativa é obrigatória para a suspensão de usuários."
          ],
          maxlength: [1000, "A justificativa deve ter no máximo 1000 caracteres."]
        },
        suspensao_ate: {
          type: Date,
          default: null
        },
        resultado_denuncia: {
          type: String,
          enum: ["PROCEDENTE", "IMPROCEDENTE"],
          required: [
            function () {
              return this.tipo_acao === "RESOLUCAO_DENUNCIA";
            },
            "O resultado da análise é obrigatório ao resolver uma denúncia."
          ]
        },
        resposta_administrativa: {
          type: String,
          trim: true,
          default: null,
          maxlength: [1000, "A resposta administrativa deve ter no máximo 1000 caracteres."]
        },
        acao_tomada: {
          type: String,
          trim: true,
          default: null,
          maxlength: [500, "A ação tomada deve ter no máximo 500 caracteres."]
        },
        data_acao: {
          type: Date,
          default: Date.now
        }
      },
      {
        timestamps: true,
        versionKey: false,
      }
    );

    schema.pre("validate", function syncAlvoModel(next) {
      if (this.tipo_alvo === "USUARIO") this.alvo_model = "Usuario";
      if (this.tipo_alvo === "ITEM") this.alvo_model = "ItemDoacao";
      if (this.tipo_alvo === "DENUNCIA") this.alvo_model = "Denuncia";
      next();
    });

    schema.plugin(mongoosePaginate);

    schema.index({ administrador_id: 1, data_acao: -1 });
    schema.index({ tipo_alvo: 1, alvo_id: 1, data_acao: -1 });
    schema.index({ tipo_acao: 1, data_acao: -1 });

    this.model = mongoose.model("Administracao", schema, "administracoes");
  }
}

export default new Administracao().model;
