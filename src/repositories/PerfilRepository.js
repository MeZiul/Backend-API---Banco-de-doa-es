import Usuario from '../models/Usuario.js';
import BaseRepository from './base/BaseRepository.js';

class PerfilRepository extends BaseRepository {
    constructor() {
        super(Usuario);
    }
}

export default new PerfilRepository();