import BaseRepository from "./base/BaseRepository.js";
import CategoriaFilterBuilder from "./filters/CategoriaFilterBuilder.js";

class CategoriaRepository extends BaseRepository {
  constructor() {
    super("categoria");
  }

  normalizeData(data) {
    const clean = super.normalizeData(data);
    if (typeof clean.nome === "string") clean.nome = clean.nome.trim();
    return clean;
  }

  async buscarPorNome(nome) {
    const record = await this.delegate.findUnique({
      where: { nome: String(nome).trim() },
    });
    return this.mapRecord(record);
  }

  listar({ filtros = {}, page = 1, limit = 15 }) {
    const builder = new CategoriaFilterBuilder()
      .comNome(filtros.nome)
      .comAtivo(filtros.ativo);

    return this.listarComPaginacao(builder.build(), {
      page,
      limit,
      sort: { ordem: 1 },
    });
  }
}

export default CategoriaRepository;
