// src/utils/validators/schemas/zod/querys/UsuarioQuerySchema.js

import { z } from "zod-v3";
import { isEntityId } from "../ObjectIdSchema.js";

const isValidDate = (value) => !value || !Number.isNaN(new Date(value).getTime());
const periodoAdministrativo = {
  dataInicio: z.string().optional()
    .refine(isValidDate, { message: "dataInicio inválida" }),
  dataFim: z.string().optional()
    .refine(isValidDate, { message: "dataFim inválida" }),
};

export const UsuarioIdSchema = z.string().refine(
  (id) => isEntityId(id),
  { message: "ID inválido" }
);

export const UsuarioQuerySchema = z.object({
  nome: z.string().optional()
    .refine((val) => val === undefined || val.trim().length > 0, { message: "Nome não pode ser vazio" })
    .transform((val) => val?.trim()),
  email: z.union([z.string().email("Formato de email inválido"), z.undefined()]).optional(),
  cpf: z.string().optional()
    .refine((v) => !v || v.trim().length > 0, { message: "CPF não pode ser vazio" })
    .transform((v) => v?.trim()),
  cidade: z.string().optional()
    .transform((v) => v?.trim()),
  uf: z.string().optional()
    .refine((v) => !v || v.trim().length === 2, { message: "UF deve ter 2 caracteres" })
    .transform((v) => v?.trim().toUpperCase()),
  situacao: z.string().optional()
    .refine((v) => !v || ["ATIVO", "SUSPENSO", "INATIVO"].includes(v), {
      message: "situacao deve ser ATIVO, SUSPENSO ou INATIVO",
    }),
  perfil: z.string().optional()
    .refine((v) => !v || ["USUARIO", "ADMINISTRADOR"].includes(v), {
      message: "perfil deve ser USUARIO ou ADMINISTRADOR",
    }),
  page: z.string().optional()
    .transform((val) => (val ? parseInt(val, 10) : 1))
    .refine((val) => Number.isInteger(val) && val > 0, { message: "Page deve ser inteiro maior que 0" }),
  limit: z.string().optional()
    .transform((val) => (val ? parseInt(val, 10) : undefined))
    .refine((val) => val === undefined || (Number.isInteger(val) && val > 0 && val <= 100), {
      message: "Limit deve ser entre 1 e 100",
    }),
  limite: z.string().optional()
    .transform((val) => (val ? parseInt(val, 10) : 20))
    .refine((val) => Number.isInteger(val) && val > 0 && val <= 100, { message: "Limite deve ser entre 1 e 100" }),
});

export const AdministracaoUsuarioQuerySchema = UsuarioQuerySchema.extend(periodoAdministrativo);
