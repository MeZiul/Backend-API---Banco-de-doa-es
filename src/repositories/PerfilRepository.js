import BaseRepository from './base/BaseRepository.js';

class PerfilRepository extends BaseRepository {
    constructor() {
        super("usuario");
    }

    async buscarPorEmail(email) {
        const record = await this.delegate.findUnique({
            where: { email: String(email).trim().toLowerCase() },
        });
        return this.mapRecord(record);
    }
}

export default new PerfilRepository();
