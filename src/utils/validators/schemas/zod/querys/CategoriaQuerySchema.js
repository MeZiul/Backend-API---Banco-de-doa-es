import { z } from "zod-v3";
import { isEntityId } from "../ObjectIdSchema.js";

export const CategoriaIdSchema = z.string().refine(
  (id) => isEntityId(id),
  { message: "ID inválido" }
);

export const CategoriaQuerySchema = z.object({
  nome: z.string().optional()
    .refine((v) => v === undefined || v.trim().length > 0, { message: "Nome não pode ser vazio" })
    .transform((v) => v?.trim()),
  ativo: z.string().optional()
    .refine((v) => !v || v === "true" || v === "false", { message: "ativo deve ser 'true' ou 'false'" })
    .transform((v) => v === undefined ? undefined : v === "true"),
  page: z.string().optional()
    .transform((v) => (v ? parseInt(v, 10) : 1))
    .refine((v) => Number.isInteger(v) && v > 0, { message: "page deve ser inteiro > 0" }),
  limite: z.string().optional()
    .transform((v) => (v ? parseInt(v, 10) : 20))
    .refine((v) => Number.isInteger(v) && v > 0 && v <= 100, { message: "limite deve ser entre 1 e 100" }),
});
