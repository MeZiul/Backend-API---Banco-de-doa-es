import UsuarioModel  from "../models/Usuario.js";
import BaseRepository from "./base/BaseRepository.js";
import UsuarioFilterBuilder from "./filters/UsuarioFilterBuilder.js";

const ADMIN_LIST_SELECT = [
    "nome",
    "email",
    "cidade",
    "uf",
    "perfil",
    "situacao",
    "media_avaliacoes",
    "total_avaliacoes",
    "total_doacoes",
    "data_cadastro",
].join(" ");

const ADMIN_DETAIL_SELECT = [
    ADMIN_LIST_SELECT,
    "telefone",
    "foto_perfil",
    "bio",
    "motivo_suspensao",
    "suspensao_ate",
    "data_atualizacao",
].join(" ");

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

    listarParaAdministracao({ filtros = {}, page = 1, limit = 15 }) {
        const builder = new UsuarioFilterBuilder()
            .comNome(filtros.nome)
            .comEmail(filtros.email)
            .comCpf(filtros.cpf)
            .comCidade(filtros.cidade)
            .comUf(filtros.uf)
            .comSituacao(filtros.situacao)
            .comPerfil(filtros.perfil)
            .comPeriodo(filtros.dataInicio, filtros.dataFim);

        return this.listarComPaginacao(builder.build(), {
            page,
            limit,
            select: ADMIN_LIST_SELECT,
            sort: { data_cadastro: -1 },
        });
    }

    buscarPorIdParaAdministracao(id) {
        return this.buscarPorId(id, { select: ADMIN_DETAIL_SELECT });
    }
}

export default UsuarioRepository;
