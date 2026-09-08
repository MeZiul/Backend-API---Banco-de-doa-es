import { Prisma } from "@prisma/client";
import { AdministracaoResponseSchema } from "./validators/schemas/zod/AdministracaoSchema.js";
import { AvaliacaoResponseSchema } from "./validators/schemas/zod/AvaliacaoSchema.js";
import { CategoriaResponseSchema } from "./validators/schemas/zod/CategoriaSchema.js";
import { DenunciaResponseSchema } from "./validators/schemas/zod/DenunciaSchema.js";
import {
  ItemDoacaoResponseSchema,
} from "./validators/schemas/zod/ItemDoacaoSchema.js";
import { InteresseResponseSchema } from "./validators/schemas/zod/InteresseSchema.js";
import {
  NotificacaoResponseSchema,
} from "./validators/schemas/zod/NotificacaoSchema.js";
import { UsuarioResponseSchema } from "./validators/schemas/zod/UsuarioSchema.js";

const MODELOS_PUBLICOS = {
  Usuario: {
    schema: UsuarioResponseSchema,
  },
  Administracao: {
    schema: AdministracaoResponseSchema,
    excluir: ["alvo_usuario_id", "alvo_item_id", "alvo_denuncia_id"],
    adicionar: ["alvo_id", "alvo_model"],
  },
  Avaliacao: { schema: AvaliacaoResponseSchema },
  Categoria: { schema: CategoriaResponseSchema },
  Denuncia: { schema: DenunciaResponseSchema },
  Interesse: { schema: InteresseResponseSchema },
  ItemDoacao: {
    schema: ItemDoacaoResponseSchema,
    adicionar: ["fotos"],
  },
  Notificacao: { schema: NotificacaoResponseSchema },
};

function getPrismaModel(modelName) {
  const model = Prisma.dmmf.datamodel.models.find(({ name }) => name === modelName);
  if (!model) {
    throw new Error(`[PARIDADE] Model Prisma não encontrado: ${modelName}`);
  }
  return model;
}

export function obterCamposPublicosDoPrisma(modelName) {
  const config = MODELOS_PUBLICOS[modelName];
  if (!config) {
    throw new Error(`[PARIDADE] Modelo público não configurado: ${modelName}`);
  }

  const excluir = new Set(config.excluir ?? []);
  const fields = getPrismaModel(modelName).fields
    .filter(({ kind, name }) => kind !== "object" && !excluir.has(name))
    .map(({ name }) => (name === "id" ? "_id" : name));

  return [...fields, ...(config.adicionar ?? [])].sort();
}

function verificar(modelName) {
  const config = MODELOS_PUBLICOS[modelName];
  const prismaFields = new Set(obterCamposPublicosDoPrisma(modelName));
  const schemaFields = new Set(Object.keys(config.schema.shape ?? {}));
  const faltantes = [...prismaFields].filter((field) => !schemaFields.has(field));
  const excedentes = [...schemaFields].filter((field) => !prismaFields.has(field));

  if (faltantes.length || excedentes.length) {
    const detalhes = [];
    if (faltantes.length) detalhes.push(`ausentes no Zod: ${faltantes.join(", ")}`);
    if (excedentes.length) detalhes.push(`sem origem pública no Prisma: ${excedentes.join(", ")}`);
    throw new Error(`[PARIDADE] ${modelName}: ${detalhes.join("; ")}`);
  }
}

export const verificarParidadeUsuario = () => verificar("Usuario");
export const verificarParidadeAdministracao = () => verificar("Administracao");
export const verificarParidadeAvaliacao = () => verificar("Avaliacao");
export const verificarParidadeCategoria = () => verificar("Categoria");
export const verificarParidadeDenuncia = () => verificar("Denuncia");
export const verificarParidadeInteresse = () => verificar("Interesse");
export const verificarParidadeItemDoacao = () => verificar("ItemDoacao");
export const verificarParidadeNotificacao = () => verificar("Notificacao");

export function verificarTodasParidades() {
  Object.keys(MODELOS_PUBLICOS).forEach(verificar);
}
