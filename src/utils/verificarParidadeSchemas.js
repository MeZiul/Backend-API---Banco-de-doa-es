// Verificação de paridade entre o contrato público legado da API e os schemas Zod.
// Após a migração para Prisma não existe mais mongooseModel.schema.paths; por isso
// a lista pública é explícita e versionada junto da API.

import { UsuarioResponseSchema } from "./validators/schemas/zod/UsuarioSchema.js";
import { AdministracaoResponseSchema } from "./validators/schemas/zod/AdministracaoSchema.js";
import { AvaliacaoResponseSchema } from "./validators/schemas/zod/AvaliacaoSchema.js";
import { CategoriaResponseSchema } from "./validators/schemas/zod/CategoriaSchema.js";
import { DenunciaResponseSchema } from "./validators/schemas/zod/DenunciaSchema.js";
import { InteresseResponseSchema } from "./validators/schemas/zod/InteresseSchema.js";

const CONTRATOS = {
  Usuario: {
    fields: [
      "_id", "nome", "email", "cpf", "telefone", "cidade", "uf",
      "foto_perfil", "bio", "perfil", "situacao", "motivo_suspensao",
      "suspensao_ate", "media_avaliacoes", "total_avaliacoes",
      "total_doacoes", "data_cadastro", "data_atualizacao",
    ],
    schema: UsuarioResponseSchema,
  },
  Administracao: {
    fields: [
      "_id", "administrador_id", "tipo_acao", "tipo_alvo", "alvo_id",
      "alvo_model", "justificativa", "suspensao_ate", "resultado_denuncia",
      "resposta_administrativa", "acao_tomada", "data_acao",
      "createdAt", "updatedAt",
    ],
    schema: AdministracaoResponseSchema,
  },
  Avaliacao: {
    fields: [
      "_id", "item_id", "avaliador_id", "avaliado_id", "nota",
      "comentario", "tipo", "data_avaliacao",
    ],
    schema: AvaliacaoResponseSchema,
  },
  Categoria: {
    fields: [
      "_id", "nome", "descricao", "icone", "ativo", "ordem",
      "data_cadastro", "data_atualizacao",
    ],
    schema: CategoriaResponseSchema,
  },
  Denuncia: {
    fields: [
      "_id", "denunciante_id", "tipo_alvo", "alvo_item_id",
      "alvo_usuario_id", "motivo", "descricao", "status",
      "resposta_admin", "admin_id", "acao_tomada", "data_denuncia",
      "data_analise", "createdAt", "updatedAt",
    ],
    schema: DenunciaResponseSchema,
  },
  Interesse: {
    fields: [
      "_id", "item_id", "usuario_interessado_id", "usuario_doador_id",
      "mensagem_interessado", "resposta_doador", "status",
      "data_interesse", "data_resposta", "data_cancelamento",
      "createdAt", "updatedAt",
    ],
    schema: InteresseResponseSchema,
  },
};

function verificar(nome) {
  const contrato = CONTRATOS[nome];
  const schemaFields = new Set(Object.keys(contrato.schema.shape ?? {}));
  const faltantes = contrato.fields.filter((field) => !schemaFields.has(field));

  if (faltantes.length) {
    throw new Error(
      `[PARIDADE] ${nome}: campos públicos não mapeados no ResponseSchema: ${faltantes.join(", ")}`,
    );
  }
}

export const verificarParidadeUsuario = () => verificar("Usuario");
export const verificarParidadeAdministracao = () => verificar("Administracao");
export const verificarParidadeAvaliacao = () => verificar("Avaliacao");
export const verificarParidadeCategoria = () => verificar("Categoria");
export const verificarParidadeDenuncia = () => verificar("Denuncia");
export const verificarParidadeInteresse = () => verificar("Interesse");

export function verificarTodasParidades() {
  Object.keys(CONTRATOS).forEach(verificar);
}
