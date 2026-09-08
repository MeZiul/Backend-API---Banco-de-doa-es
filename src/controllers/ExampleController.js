// src/controllers/UsuarioController.js

import CommonResponse from '../utils/helpers/CommonResponse.js';

class ExampleController {
    listar = async (req, res, next) => {
        // reposta direta sem passar por service ou model, apenas para exemplificar a estrutura de camadas
        try {
            
            // TODO - implementar lógica de listagem de examples (ex: buscar no banco de dados usando o model, aplicar filtros, paginação, etc)
        } catch (e) {
            next(e);
        }
    };

}

export default new ExampleController();
