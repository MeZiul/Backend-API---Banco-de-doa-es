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
import AdministracaoModel from '../models/Administracao.js';
import AvaliacaoModel from '../models/Avaliacao.js';
import CategoriaModel from '../models/Categoria.js';
import DenunciaModel from '../models/Denuncia.js';
import InteresseModel from '../models/Interesse.js';
//import ItemDoacaoModel from '../models/ItemDoacao.js';
//import NotificacaoModel from '../models/Notificacao.js';




import { UsuarioResponseSchema }     from './validators/schemas/zod/UsuarioSchema.js';
import {  AdministracaoResponseSchema }     from './validators/schemas/zod/AdministracaoSchema.js';
import { AvaliacaoResponseSchema }     from './validators/schemas/zod/AvaliacaoSchema.js';
import { CategoriaResponseSchema }     from './validators/schemas/zod/CategoriaSchema.js';
import { DenunciaResponseSchema }     from './validators/schemas/zod/DenunciaSchema.js';
import { InteresseResponseSchema }     from './validators/schemas/zod/InteresseSchema.js';
import Administracao from '../models/Administracao.js';
import Avaliacao from '../models/Avaliacao.js';
import Categoria from '../models/Categoria.js';
import Denuncia from '../models/Denuncia.js';
import Interesse from '../models/Interesse.js';
import ItemDoacao from '../models/ItemDoacao.js';
import Notificacao from '../models/Notificacao.js';
//import { ItemDoacaoResponseSchema }     from './validators/schemas/zod/ItemDoacaoSchema.js';
//import { NotificacaoResponseSchema }     from './validators/schemas/zod/NotificacaoSchema.js';


// ─────────────────────────────────────────────────────────────────────────────
// Campos que existem no model mas são intencionalmente EXCLUÍDOS da resposta
// pública. Só entre aqui se o campo for de infraestrutura interna.
// ─────────────────────────────────────────────────────────────────────────────
const CAMPOS_INTERNOS = {
  Usuario:     new Set([]),
  Administracao: new Set([]),
  Avaliacao: new Set([]),
  Categoria: new Set([]),
  Denuncia: new Set([]),
  Interesse: new Set([]),
  //ItemDoacao: new Set([]),
  //Notificacao: new Set([]),



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
export function verificarParidadeUsuario(){ verificar('Usuario',     UsuarioModel,     UsuarioResponseSchema); };
export function verificarParidadeAdministracao(){ verificar('Administracao',     AdministracaoModel,     AdministracaoResponseSchema); };
export function verificarParidadeAvaliacao(){ verificar('Avaliacao',     AvaliacaoModel,    AvaliacaoResponseSchema); };
export function verificarParidadeCategoria(){ verificar('Categorio',     CategoriaModel,     CategoriaResponseSchema); };
export function verificarParidadeDenuncia(){ verificar('Denuncia',     DenunciaModel,     DenunciaResponseSchema); };
export function verificarParidadeInteresse(){ verificar('Interesse',     InteresseModel,     InteresseResponseSchema); };
//export function verificarParidadeIntemDoacao(){ verificar('ItemDoacao',     ItemDoacaoModel,     ItemDoacaoResponseSchema); };
//export function verificarParidadeNotificacao(){ verificar('Notificacao',     NotificacaoModel,     NotificacaoResponseSchema); };

/**
 * Executa TODAS as verificações de paridade.
 * Chamada em server.js antes de app.listen — aborta o boot se houver divergência.
 */
export function verificarTodasParidades() {
  verificarParidadeUsuario();
  verificarParidadeAdministracao();
  verificarParidadeAvaliacao();
  verificarParidadeCategoria();
  verificarParidadeDenuncia();
  verificarParidadeInteresse();
 // verificarParidadeIntemDoacao();
  //verificarParidadeNotificacao();
}
