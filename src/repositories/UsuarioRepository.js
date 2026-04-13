import UsuarioModel  from "../models/Usuario.js";
import BaseRepository from "./base/BaseRepository.js";
import UsuarioFilterBuilder from "../filters/UsuarioFilterBuilder.js";

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

    buscarPorTokenRedefinir(token){
        return this.model.findOne({token_redefinicao: token}).select("+token_redefinicao + token_redefinicao_expira");
    }


    atualizarSenha(id, senha) {
        return this.atualizar(id, { 
            senha,
            token_redefinicao: null,
            token_redefinicao_expira: null,
        
        });
    }

    listar({filtros = {}, page = 1, limit = 15 }) {
        const builder = new UsuarioFilterBuilder()
            .comNome(filtros.nome)
            .comEmail(filtros.email)
            .comCpf(filtros.cpf)
            .comCidade(filtros.cidade)
            .comUf(filtros.uf)
            .comSituacao(filtros.situacao)
            .comPerfil(filtros.perfil);

        return this.listarComPaginacao(builder.build(), { 
            page, 
            limit,
            sort: { data_cadastro: -1 } 
        });

        
    
    }  


}

export default UsuarioRepository();