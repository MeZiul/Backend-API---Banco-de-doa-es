import mongoose from 'mongoose';
import mongoosePaginate from 'mongoose-paginate-v2';

class Avaliacao {
    constructor() {
        const schema = new mongoose.Schema(
            {
                item_id: {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: 'ItemDeDoacao',
                    required: true
                },

                avaliador_id: {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: 'Usuario',
                    required: true
                },

                avaliado_id: {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: 'Usuario',
                    required: true
                },

                nota: {
                    type: Number,
                    required: true,
                    min: 1,
                    max: 5
                },

                comentario: {
                    type: String,
                    trim: true
                },

                tipo:{
                    type: String,
                    enum:["DOADOR_PARA_INTERESSADO", "INTERESSADO_PARA_DOADOR"],
                    required: true
                },

                data_avaliacao: {
                    type: Date,
                    default: Date.now
                },

            },
            {
               
                versionKey: false
            }
            
    
        );
        schema.plugin(mongoosePaginate);
        schema.index({ item_id: 1, avaliador_id: 1, tipo: 1}, { unique: true });
        schema.index({ avaliado_id: 1 });
        schema.index({ item_id: 1 });

        this.model = mongoose.model('Avaliacao', schema);
    }
}

export default new Avaliacao().model;