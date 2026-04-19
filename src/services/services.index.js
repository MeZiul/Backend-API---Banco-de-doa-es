// src/containers/index.js

/*
    * Este arquivo serve como um ponto central para exportar todos os serviços e repositórios.
    * Controllers importam SOMENTE daqui — nunca instanciam services diretamente.
    *
    * Como importar?
    * import { usuarioService, instituicaoService } from '../containers/index.js';
    * import { usuarioService } from '../containers';
    * import * as Containers from '../containers';
*/

// ── Auth ────────────────────────────────────────────────

// ── Domínio principal ───────────────────────────────────
export { usuarioService } from './services.usuario.container.js';


// ── Serviços transversais ───────────────────────────────


// ── Dashboard / BI ──────────────────────────────────────
//export { dashboardService } from './services.dashboard.container.js';