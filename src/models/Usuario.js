import mongoose from "mongoose";
import mongoosePaginate from "mongoose-paginate-v2";

class Usuario {
    constructor(){
        const schema = new mongoose.schema(
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

                senhaHash: {
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
                
                data_cadastro:{type: Date, default: Date.now}, 
                data_atualizacao:{type: Date, default: Date.now},

                motivo_suspensao:{type: String, default: null},
                suspensao_ate:{type: Date, default: null},

                media_avaliacao:{type: Number, default: 0},

                token_redefinir:{type: String, select: false},
                token_redefinir_expira:{type: Date, select: false},

                tokenUpdateEmail:{type: String, select: false},
                codigo_recupera_senha:{type: String, default: null},
                exp_codigo_recupera_senha:{type: Date, default: null},


        
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