import mongoose from 'mongoose';
import mongoosePaginate from 'mongoose-paginate-v2';

class Categoria {
    constructor() {
        const schema = new mongoose.Schema(
            {
                nome: {
                    type: String,
                    required: true,
                    unique: true,
                    trim: true
                },

                descricao: {
                    type: String,
                    
                },

                icone: {
                    type: String,
                    
                },

                ativo:{
                    type: Boolean,
                    required: true,
                    default: true
                },

                ordem: {
                    type: Number,
                   default: 0
                },

            },
            {
            timestamps: {createdAt: "data_cadastro",updatedAt: "data_atualizacao"},
            versionKey: false  

            }

        );
            
        schema.plugin(mongoosePaginate);
        schema.index({ nome: 1 }, { unique: true });
        schema.index({ ativo: 1 });
        schema.index({ ordem: 1 });

        this.model = mongoose.model("Categoria", schema);

    }


}
      
export default new Categoria().model;