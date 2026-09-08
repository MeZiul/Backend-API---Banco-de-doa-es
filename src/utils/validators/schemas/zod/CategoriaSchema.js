import { z } from "zod-v3";
export { CategoriaIdSchema, CategoriaQuerySchema } from "./querys/CategoriaQuerySchema.js";

const CategoriaSchema = z.object({
  nome:      z.string().min(2, "Nome deve ter no mínimo 2 caracteres."),
  descricao: z.string().optional(),
  icone:     z.string().optional(),
  ativo:     z.boolean().default(true),
  ordem:     z.number().int().min(0).default(0),
});

const CategoriaUpdateSchema = CategoriaSchema.partial();

const CategoriaResponseSchema = z.object({
  _id:              z.string(),
  nome:             z.string(),
  descricao:        z.string().nullable().optional(),
  icone:            z.string().nullable().optional(),
  ativo:            z.boolean(),
  ordem:            z.number().int(),
  data_cadastro:    z.string().datetime(),
  data_atualizacao: z.string().datetime(),
}).strict();

export { CategoriaSchema, CategoriaUpdateSchema, CategoriaResponseSchema };
