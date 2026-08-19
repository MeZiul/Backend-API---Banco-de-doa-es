import BaseRepository from "./base/BaseRepository.js";

class PerfilRepository extends BaseRepository {
  constructor() {
    super("usuario");
  }
}

export default new PerfilRepository();
