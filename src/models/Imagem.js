const mongoose = require('mongoose');

const ImagemSchema = new mongoose.Schema({
    nome: {type: String, require: true},
    url: {type: String, require: true},
    tipo: {type: String},
    itemDoacaoId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'ItemDoacao',
        require: true
    }
}, {timestamps: true});

module.exports = mongoose.model('Imagem', ImagemSchema);
