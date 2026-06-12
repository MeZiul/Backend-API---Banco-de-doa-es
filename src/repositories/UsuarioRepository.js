import UsuarioModel  from "../models/Usuario.js";
import BaseRepository from "./base/BaseRepository.js";
import UsuarioFilterBuilder from "./filters/UsuarioFilterBuilder.js";

class UsuarioRepository extends BaseRepository { 
    constructor(){
        super(UsuarioModel);
    }

    buscarPorEmail(email){
        return this.model.findOne({email});
    }
    
    buscarPorCpf(cpf){
        return this.model.findOne({cpf});
    }
    
    buscarPorEmailComSenha(email){
        return this.model.findOne({email}).select("+senha");
    }

    buscarPorTokenRedefinicao(token){
        return this.model.findOne({token_redefinicao: token}).select("+token_redefinicao +token_redefinicao_expira");
    }


    atualizarSenha(id, senha) {
        return this.atualizar(id, { 
            senha,
            token_redefinicao: null,
            token_redefinicao_expira: null,
        
        });
    }

    atualizarSeSituacao(id, situacaoEsperada, dadosAtualizacao, filtrosAdicionais = {}) {
        const situacao = Array.isArray(situacaoEsperada)
            ? { $in: situacaoEsperada }
            : situacaoEsperada;

        return this.model.findOneAndUpdate(
            {
                _id: id,
                situacao,
                ...filtrosAdicionais,
            },
            { $set: dadosAtualizacao },
            { new: true, runValidators: true }
        );
    }

    listar({filtros = {}, page = 1, limit = 15 }) {
        const builder = new UsuarioFilterBuilder()
            .comNome(filtros.nome)
            .comCidade(filtros.cidade)
            .comUf(filtros.uf)
            .comSituacao(filtros.situacao)


        return this.listarComPaginacao(builder.build(), { 
            page, 
            limit,
            sort: { data_cadastro: -1 } 
        });

        
    
    }  


}

export default UsuarioRepository;
