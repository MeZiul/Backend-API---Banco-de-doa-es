import { CustomError } from "../utils/helpers/index.js";

class CategoriaService {

  constructor({ categoriaRepository }) {
    this.repository = categoriaRepository;
  }

  async criar(dados) {
    const nomeExiste = await this.repository.buscarPorNome(dados.nome);
    if (nomeExiste) {
      throw new CustomError({
        statusCode: 409,
        customMessage: "Já existe uma categoria com este nome.",
      });
    }

    return this.repository.criar(dados);
  }

  async atualizar(id, dados) {
    await this.ensureExists(id);

    if (dados.nome) {
      const nomeExiste = await this.repository.buscarPorNome(dados.nome);
      if (nomeExiste && nomeExiste._id.toString() !== id) {
        throw new CustomError({
          statusCode: 409,
          customMessage: "Já existe uma categoria com este nome.",
        });
      }
    }

    return this.repository.atualizar(id, dados);
  }

  async deletar(id) {
    await this.ensureExists(id);
    return this.repository.deletar(id);
  }

  async listar({ filtros = {}, page = 1, limit = 20 }, isAdmin = false) {
    if (!isAdmin) {
      filtros.ativo = true;
    }

    return this.repository.listar({ filtros, page, limit });
  }

  async buscarPorId(id) {
    return this.ensureExists(id);
  }

  async ensureExists(id) {
    const categoria = await this.repository.buscarPorId(id);
    if (!categoria) {
      throw new CustomError({
        statusCode: 404,
        customMessage: "Categoria não encontrada.",
      });
    }
    return categoria;
  }
}

export default CategoriaService;