import Usuario from '../models/Usuario.js';
import BaseRepository from './base/BaseRepository.js';

class PerfilRepository extends BaseRepository {
    constructor() {
        super(Usuario);
    }

    buscarPorEmail(email) {
        return this.model.findOne({ email });
    }
}

export default new PerfilRepository();
