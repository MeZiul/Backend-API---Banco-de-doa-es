const express = require('express');
const router = express.Router();
const ItemController = require('./controllers/ItemDoacaoController');

router.post('/itens-doacao', ItemController.criar);

router.get('/itens-doacao', ItemController.listar);


router.post('/itens-doacao/:id/imagens', ItemController.adicionarImagem);

module.exports = router;