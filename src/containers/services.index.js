/*
    * Este arquivo serve como um ponto central para exportar todos os serviços e repositórios.
    * Controllers importam SOMENTE daqui — nunca instanciam services diretamente.
    *
    * Como importar?
    * import { usuarioService, instituicaoService } from '../containers/index.js';
    * import { usuarioService } from '../containers';
    * import * as Containers from '../containers';
*/


// ── Autenticação / Usuário ───────────────────────────────────────
export { autenticacaoService } from "./services.autenticacao.container.js";
export { usuarioService }     from "./services.usuario.container.js";

// ── Domínio principal ────────────────────────────────────────────
export { categoriaService }   from "./services.categoria.container.js";
export { itemDoacaoService }  from "./services.itemDoacao.container.js";
export { interesseService }   from "./services.interesse.container.js";
export { avaliacaoService }   from "./services.avaliacao.container.js";
export { denunciaService }    from "./services.denuncia.container.js";
export { administracaoService } from "./services.administracao.container.js";

// ── Serviços transversais ────────────────────────────────────────
//export { notificacaoService } from "./services.notificacao.container.js";
