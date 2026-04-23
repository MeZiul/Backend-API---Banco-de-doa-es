import { z } from "zod";
import mongoose from "mongoose";

const isValidObjectId = (value) => !value || mongoose.Types.ObjectId.isValid(value);
const isValidDate = (value) => !value || !Number.isNaN(new Date(value).getTime());

export const DenunciaIdSchema = z.string().refine(
  (id) => mongoose.Types.ObjectId.isValid(id),
  { message: "ID inválido" }
);

export const DenunciaQuerySchema = z.object({
  denunciante_id: z.string().optional()
    .refine(isValidObjectId, { message: "denunciante_id inválido" }),
  denuncianteId: z.string().optional()
    .refine(isValidObjectId, { message: "denuncianteId inválido" }),
  tipo_alvo: z.string().optional()
    .refine((value) => !value || ["ITEM", "USUARIO"].includes(value), {
      message: "tipo_alvo inválido",
    }),
  tipoAlvo: z.string().optional()
    .refine((value) => !value || ["ITEM", "USUARIO"].includes(value), {
      message: "tipoAlvo inválido",
    }),
  alvo_item_id: z.string().optional()
    .refine(isValidObjectId, { message: "alvo_item_id inválido" }),
  alvoItemId: z.string().optional()
    .refine(isValidObjectId, { message: "alvoItemId inválido" }),
  alvo_usuario_id: z.string().optional()
    .refine(isValidObjectId, { message: "alvo_usuario_id inválido" }),
  alvoUsuarioId: z.string().optional()
    .refine(isValidObjectId, { message: "alvoUsuarioId inválido" }),
  motivo: z.string().optional()
    .refine((value) => !value || ["CONTEUDO_INAPROPRIADO", "ITEM_PROIBIDO", "FRAUDE", "ASSEDIO", "SPAM", "OUTRO"].includes(value), {
      message: "motivo inválido",
    }),
  status: z.string().optional()
    .refine((value) => !value || ["EM_ANALISE", "PROCEDENTE", "IMPROCEDENTE"].includes(value), {
      message: "status inválido",
    }),
  admin_id: z.string().optional()
    .refine(isValidObjectId, { message: "admin_id inválido" }),
  adminId: z.string().optional()
    .refine(isValidObjectId, { message: "adminId inválido" }),
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
