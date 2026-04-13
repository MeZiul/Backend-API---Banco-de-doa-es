import mongoose from "mongoose";
import mongoosePaginate from "mongoose-paginate-v2";

class Usuario {
    constructor(){
        const schema = new mongoose.Schema(
           { 
                nome: { 
                    type: String,
                    required: true,
                    trim: true
                },

                email: {
                    type: String,
                    required: true, 
                    unique: true, 
                    lowercase: true,
                    trim: true
        
                },

                cpf: {
                    type: String,
                    required: true,
                    unique: true
                },
                
                telefone:{type: String},

                cidade:{
                    type: String,
                    require: true
                },
                
                uf:{
                    type: String,
                    required: true,
                    maxlength: 2
                },

                senha: {
                    type: String,
                    required: true,
                    select: false
                },
                
                foto_perfil:{type:String},

                bio:{type: String,
                    maxlength:500
                },

                perfil:{
                    type: String,
                    enum: ["USUARIO", "ADMINISTRADOR"],
                    required: true,
                    default: "USUARIO"
                },

                situacao:{
                    type: String,
                    enum:["ATIVO", "SUSPENSO", "INATIVO"],
                    default: "ATIVO",
                    required: true
                },
                

                motivo_suspensao:{type: String, default: null},
                suspensao_ate:{type: Date, default: null},

                media_avaliacoes:{type: Number, default: 0},
                total_avaliacoes:{type: Number, default: 0},
                total_doacoes:{type: Number, default: 0},

                token_redefinicao:{type: String, select: false, default: null},
                token_redefinir_expira:{type: Date, select: false, default: null},

        
            },

            {
                timestamps: {createdAt: "data_cadastro", updatedAt: "data_atualizacao"},
                versionKey: false
            }
        );
         
        schema.plugin(mongoosePaginate);
        schema.index({email: 1, cpf: 1});
        schema.index({cidade: 1, uf: 1});
        schema.index({situacao: 1});
        schema.index({perfil: 1});

        this.model = mongoose.model("Usuario", schema);
   
        
        
    }       
}

export default new Usuario().model;