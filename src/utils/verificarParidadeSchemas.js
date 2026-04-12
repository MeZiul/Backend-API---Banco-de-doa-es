// src/utils/verificarParidadeSchemas.js
//
// Chamado no startup (server.js) para garantir que todos os models e seus
// ResponseSchemas estejam sincronizados. Se um campo público for adicionado a
// qualquer model sem ser mapeado no schema correspondente, a API recusa o boot.
//
// A mesma lógica existe em src/tests/unit/models/usuario.parity.test.js para
// CI (npm test). Aqui ela protege o ambiente de desenvolvimento.
//
// ─── QUANDO ADICIONAR UM CAMPO AO MODEL ──────────────────────────────────────
//  A  → Adicione ao ResponseSchema        (campo público → Swagger atualiza)
//  B  → Adicione ao SeedSchema            (campo a ser populado no seed)
//  C  → Adicione a CAMPOS_INTERNOS abaixo (infra interna, nunca exposto na API)

import UsuarioModel     from '../models/Usuario.js';
import FilaModel        from '../models/Fila.js';
import InstituicaoModel from '../models/Instituicao.js';
import SenhaModel       from '../models/Senha.js';
import QrCodeModel      from '../models/QrCode.js';
import AuditoriaModel   from '../models/Auditoria.js';
import LandingPageModel from '../models/LandingPage.js';

import { UsuarioResponseSchema }     from './validators/schemas/zod/UsuarioSchema.js';
import { FilaResponseSchema }        from './validators/schemas/zod/FilaSchema.js';
import { InstituicaoResponseSchema } from './validators/schemas/zod/InstituicaoSchema.js';
import { SenhaResponseSchema }       from './validators/schemas/zod/SenhaSchema.js';
import { QrCodeResponseSchema }      from './validators/schemas/zod/QrCodeSchema.js';
import { AuditoriaResponseSchema }   from './validators/schemas/zod/AuditoriaSchema.js';
import { LandingPageResponseSchema } from './validators/schemas/zod/LandingPageSchema.js';

// ─────────────────────────────────────────────────────────────────────────────
// Campos que existem no model mas são intencionalmente EXCLUÍDOS da resposta
// pública. Só entre aqui se o campo for de infraestrutura interna.
// ─────────────────────────────────────────────────────────────────────────────
const CAMPOS_INTERNOS = {
  Usuario:     new Set(['codigo_recupera_senha', 'exp_codigo_recupera_senha']),
  Fila:        new Set([]),
  Instituicao: new Set([]),
  Senha:       new Set([]),
  QrCode:      new Set([]),
  Auditoria:   new Set([]),
  LandingPage: new Set([]),
};

// ─────────────────────────────────────────────────────────────────────────────
// Helper: extrai campos de primeiro nível de um schema Mongoose.
// Funciona com nested paths (ex: header.logo_icon → header) e subdocumentos.
// Exclui: __v, '$' (referência de array), campos com select:false.
// ─────────────────────────────────────────────────────────────────────────────
function camposPublicos(mongooseModel) {
  return [...new Set(
    Object.entries(mongooseModel.schema.paths)
      .filter(([key]) => key !== '__v')
      .filter(([, path]) => path.options?.select !== false)
      .map(([key]) => key.split('.')[0])
      .filter((key) => key !== '$'),
  )];
}

// ─────────────────────────────────────────────────────────────────────────────
// Verificação genérica reutilizada por todos os models
// ─────────────────────────────────────────────────────────────────────────────
function verificar(nomeModel, mongooseModel, responseSchema) {
  const internos    = CAMPOS_INTERNOS[nomeModel] ?? new Set();
  const publicos    = camposPublicos(mongooseModel);
  const noSchema    = Object.keys(responseSchema.shape ?? {});
  const naoMapeados = publicos.filter(
    (k) => !noSchema.includes(k) && !internos.has(k),
  );

  if (naoMapeados.length > 0) {
    throw new Error(
      `\n[PARIDADE] Model ${nomeModel} tem campos públicos não mapeados no ${nomeModel}ResponseSchema:\n` +
      `  → ${naoMapeados.join(', ')}\n\n` +
      `Para cada campo não mapeado, escolha uma ação:\n` +
      `  (A) Adicione ao ${nomeModel}ResponseSchema               → campo público da API (Swagger se atualiza automaticamente)\n` +
      `  (B) Adicione ao ${nomeModel}SeedSchema                   → atualize também os dados do seed\n` +
      `  (C) Adicione a CAMPOS_INTERNOS['${nomeModel}']           → infra interna, nunca exposto na API\n` +
      `      (em src/utils/verificarParidadeSchemas.js)\n`,
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Funções públicas — usadas por server.js e por testes de paridade
// ─────────────────────────────────────────────────────────────────────────────
export function verificarParidadeUsuario()     { verificar('Usuario',     UsuarioModel,     UsuarioResponseSchema); }
export function verificarParidadeFila()        { verificar('Fila',        FilaModel,        FilaResponseSchema); }
export function verificarParidadeInstituicao() { verificar('Instituicao', InstituicaoModel, InstituicaoResponseSchema); }
export function verificarParidadeSenha()       { verificar('Senha',       SenhaModel,       SenhaResponseSchema); }
export function verificarParidadeQrCode()      { verificar('QrCode',      QrCodeModel,      QrCodeResponseSchema); }
export function verificarParidadeAuditoria()   { verificar('Auditoria',   AuditoriaModel,   AuditoriaResponseSchema); }
export function verificarParidadeLandingPage() { verificar('LandingPage', LandingPageModel, LandingPageResponseSchema); }

/**
 * Executa TODAS as verificações de paridade.
 * Chamada em server.js antes de app.listen — aborta o boot se houver divergência.
 */
export function verificarTodasParidades() {
  verificarParidadeUsuario();
  verificarParidadeFila();
  verificarParidadeInstituicao();
  verificarParidadeSenha();
  verificarParidadeQrCode();
  verificarParidadeAuditoria();
  verificarParidadeLandingPage();
}
