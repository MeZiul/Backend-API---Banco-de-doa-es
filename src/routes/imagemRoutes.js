const express = require('express');
const router = express.Router();
const ImagemController = require('../controllers/ImagemController');

router.post('/imagens/upload', ImagemController.adicionarImagem);

router.delete('/imagens/:id', ImagemController.excluirImagem);

module.exports = router;