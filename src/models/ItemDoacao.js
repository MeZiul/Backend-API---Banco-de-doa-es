const mongoose = require('mongoose');

const ItemDoacaoSchema = new mongoose.Schema({
    titulo: {
        type: String,
        required: [true, 'O título é obrigatório']
    },
    descricao: {
        type: String,
        required: [true, 'A descrição é obrigatória']
    },
    quantidade: {
        type: Number,
        default: 1
    },
    imagens: [{
        type: String
    }],
    usuarioId: {
        type: String,
        required: true
    },
    status: {
        type: String,
        enum: ['DISPONIVEL', 'RESERVADO', 'CONCLUIDO'],
        default: 'DISPONIVEL'
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('ItemDoacao', ItemDoacaoSchema);