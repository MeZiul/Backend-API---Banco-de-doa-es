import { z } from "zod-v3";
import { isEntityId } from "../ObjectIdSchema.js";

const isValidEntityId = (value) => !value || isEntityId(value);
const isValidDate = (value) => !value || !Number.isNaN(new Date(value).getTime());

export const InteresseIdSchema = z.string().refine(
  (id) => isEntityId(id),
  { message: "ID inválido" }
);

export const InteresseQuerySchema = z.object({
  item_id: z.string().optional()
    .refine(isValidEntityId, { message: "item_id inválido" }),
  itemId: z.string().optional()
    .refine(isValidEntityId, { message: "itemId inválido" }),
  usuario_interessado_id: z.string().optional()
    .refine(isValidEntityId, { message: "usuario_interessado_id inválido" }),
  usuarioInteressadoId: z.string().optional()
    .refine(isValidEntityId, { message: "usuarioInteressadoId inválido" }),
  usuario_doador_id: z.string().optional()
    .refine(isValidEntityId, { message: "usuario_doador_id inválido" }),
  usuarioDoadorId: z.string().optional()
    .refine(isValidEntityId, { message: "usuarioDoadorId inválido" }),
  status: z.string().optional()
    .refine((value) => !value || ["PENDENTE", "ACEITO", "RECUSADO", "CANCELADO", "EXPIRADO"].includes(value), {
      message: "status inválido",
    }),
  dataInicio: z.string().optional()
    .refine(isValidDate, { message: "dataInicio inválida" }),
  dataFim: z.string().optional()
    .refine(isValidDate, { message: "dataFim inválida" }),
  page: z.string().optional()
    .transform((value) => (value ? parseInt(value, 10) : 1))
    .refine((value) => Number.isInteger(value) && value > 0, {
      message: "page deve ser inteiro maior que 0",
    }),
  limit: z.string().optional()
    .transform((value) => (value ? parseInt(value, 10) : undefined))
    .refine((value) => value === undefined || (Number.isInteger(value) && value > 0 && value <= 100), {
      message: "limit deve ser entre 1 e 100",
    }),
  limite: z.string().optional()
    .transform((value) => (value ? parseInt(value, 10) : 20))
    .refine((value) => Number.isInteger(value) && value > 0 && value <= 100, {
      message: "limite deve ser entre 1 e 100",
    }),
});
