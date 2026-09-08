import { z } from "zod-v3";
import { isEntityId } from "../ObjectIdSchema.js";

const isValidEntityId = (value) => !value || isEntityId(value);
const isValidDate = (value) => !value || !Number.isNaN(new Date(value).getTime());

export const AdministracaoIdSchema = z.string().refine(
  (id) => isEntityId(id),
  { message: "ID inválido" }
);

export const AdministracaoQuerySchema = z.object({
  administrador_id: z.string().optional()
    .refine(isValidEntityId, { message: "administrador_id inválido" }),
  administradorId: z.string().optional()
    .refine(isValidEntityId, { message: "administradorId inválido" }),
  tipo_acao: z.string().optional()
    .refine((value) => !value || ["BLOQUEIO_USUARIO", "DESBLOQUEIO_USUARIO", "INATIVACAO_USUARIO", "CANCELAMENTO_ITEM", "RESOLUCAO_DENUNCIA"].includes(value), {
      message: "tipo_acao inválido",
    }),
  tipoAcao: z.string().optional()
    .refine((value) => !value || ["BLOQUEIO_USUARIO", "DESBLOQUEIO_USUARIO", "INATIVACAO_USUARIO", "CANCELAMENTO_ITEM", "RESOLUCAO_DENUNCIA"].includes(value), {
      message: "tipoAcao inválido",
    }),
  tipo_alvo: z.string().optional()
    .refine((value) => !value || ["USUARIO", "ITEM", "DENUNCIA"].includes(value), {
      message: "tipo_alvo inválido",
    }),
  tipoAlvo: z.string().optional()
    .refine((value) => !value || ["USUARIO", "ITEM", "DENUNCIA"].includes(value), {
      message: "tipoAlvo inválido",
    }),
  alvo_id: z.string().optional()
    .refine(isValidEntityId, { message: "alvo_id inválido" }),
  alvoId: z.string().optional()
    .refine(isValidEntityId, { message: "alvoId inválido" }),
  resultado_denuncia: z.string().optional()
    .refine((value) => !value || ["PROCEDENTE", "IMPROCEDENTE"].includes(value), {
      message: "resultado_denuncia inválido",
    }),
  resultadoDenuncia: z.string().optional()
    .refine((value) => !value || ["PROCEDENTE", "IMPROCEDENTE"].includes(value), {
      message: "resultadoDenuncia inválido",
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
