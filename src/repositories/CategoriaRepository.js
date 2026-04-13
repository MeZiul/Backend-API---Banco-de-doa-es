import BaseRepository from "./base/BaseRepository.js";
import CategoriaFilterBuilder from "./filters/CategoriaFilterBuilder.js";
import CategoriaModel from "../models/Categoria.js";

class CategoriaRepository extends BaseRepository {
    constructor() {
        super(CategoriaModel);
    }
        
    buscarPorNome(nome){
        return this.model.findOne({ nome });
        
    }
        
    listar ({ filtros = {}, page = 1, limit = 15 }) {
        const builder = new CategoriaFilterBuilder()
            .comNome(filtros.nome)
            .comAtivo(filtros.ativo);

        return this.listarComPaginacao(builder.build(), {
            page,
            limit,
            sort: { ordem: 1 }
        });
            
        
    }   
        
        
  
}
export default CategoriaRepository;
  
  
