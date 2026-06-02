import Usuario from "../models/Usuario.js";
import BaseRepository from "./base/BaseRepository.js";

class PerfilRepository extends BaseRepository {
    constructor() {
        super(Usuario);
    }
    async atualizarControleAcesso(usuarioId, dadosControle) {
        return await this.model.findByIdAndUpdate(
            usuarioId,
            { $set: dadosControle },
            { new: true, runValidators: true }
        ).select('-senha - __v');
    }
}
export default PerfilRepository;