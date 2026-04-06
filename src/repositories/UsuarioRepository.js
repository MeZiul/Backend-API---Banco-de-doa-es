import UsuarioModel  from "../models/Usuario";
import BaseRepository from "./base/BaseRepository";
import UsuarioFilterBuilder from "../filters/UsuarioFilterBuilder";

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
        return this.model.findOne({email}).select("+senhaHash");
    }

    buscarPorTokenRedefinir(token){
        return this.model.findOne({token_redefinir: token}).select("+token_redefinir");
    }

    buscarPorCodigoRecuperacao(codigo){
        return this.model.findOne({codigo_recupera_senha: codigo});
    }

    amarzenarTokens(id, access, refresh) {
        return this.atualizar(id, { 
            accesstoken: access,
            refreshtoken: refresh,
            data_atualizacao: new Date()
        });

    }

    removerTokens(id) {
        return this.atualizar(id, { 
            accesstoken: null,
            refreshtoken: null,
        });
    }

    atualizarSenha(id, senhaHash) {
        return this.atualizar(id, { 
            senhaHash,
            token_redefinir: null,
            token_redefinir_expira: null,
            codigo_recupera_senha: null,
            exp_codigo_recupera_senha: null,
        
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