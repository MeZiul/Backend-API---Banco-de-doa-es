import mongoose from "mongoose";
import mongoosePaginate from "mongoose-paginate-v2";

class Denuncia {
  constructor() {
    const schema = new mongoose.Schema(
      {
        denunciante_id: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Usuario",
          required: [true, "A referência ao usuário denunciante é obrigatória."]
        },
        tipo_alvo: {
          type: String,
          enum: ["ITEM", "USUARIO"],
          required: [true, "O tipo de alvo é obrigatório."]
        },

        alvo_item_id: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "ItemDoacao",
          required: [
            function () {
              return this.tipo_alvo === "ITEM";
            },
            "A referência ao item é obrigatória quando o alvo é um ITEM."
          ]
        },
        alvo_usuario_id: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Usuario",
          required: [
            function () {
              return this.tipo_alvo === "USUARIO";
            },
            "A referência ao usuário é obrigatória quando o alvo é um USUARIO."
          ]
        },
        motivo: {
          type: String,
          enum: [
            "CONTEUDO_INAPROPRIADO",
            "ITEM_PROIBIDO",
            "FRAUDE",
            "ASSEDIO",
            "SPAM",
            "OUTRO"
          ],
          required: [true, "O motivo da denúncia é obrigatório."]
        },
        descricao: {
          type: String,
          trim: true,
          default: null
        },
        status: {
          type: String,
          enum: ["EM_ANALISE", "PROCEDENTE", "IMPROCEDENTE"],
          required: [true, "O status da denúncia é obrigatório."],
          default: "EM_ANALISE"
        },
        resposta_admin: {
          type: String,
          trim: true,
          default: null
        },
        admin_id: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Usuario",
          default: null
        },
        acao_tomada: {
          type: String,
          trim: true,
          default: null
        },
        data_denuncia: {
          type: Date,
          default: Date.now
        },
        data_analise: {
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

    schema.index({ status: 1, data_denuncia: -1 });
    schema.index({ denunciante_id: 1 });
    schema.index(
      { denunciante_id: 1, alvo_item_id: 1 },
      {
        unique: true,
        name: "denuncia_item_em_analise_unica_por_denunciante",
        partialFilterExpression: {
          tipo_alvo: "ITEM",
          status: "EM_ANALISE"
        }
      }
    );
    schema.index(
      { denunciante_id: 1, alvo_usuario_id: 1 },
      {
        unique: true,
        name: "denuncia_usuario_em_analise_unica_por_denunciante",
        partialFilterExpression: {
          tipo_alvo: "USUARIO",
          status: "EM_ANALISE"
        }
      }
    );

    this.model = mongoose.model("Denuncia", schema, "denuncias");
  }
}

export default new Denuncia().model;
