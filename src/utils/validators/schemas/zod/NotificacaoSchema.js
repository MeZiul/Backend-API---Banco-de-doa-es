import { z } from "zod-v3";
import objectIdSchema from "./ObjectIdSchema.js";

const TIPOS_NOTIFICACAO = [
  "INTERESSE_RECEBIDO",
  "INTERESSE_ACEITO",
  "INTERESSE_RECUSADO",
  "INTERESSE_CANCELADO",
  "DOACAO_CONFIRMADA",
  "AVALIACAO_RECEBIDA",
  "DENUNCIA_RESULTADO",
  "USUARIO_SUSPENSO",
  "USUARIO_REATIVADO",
  "ITEM_CANCELADO",
  "SISTEMA",
];

export const NotificacaoResponseSchema = z.object({
  _id: objectIdSchema,
  usuario_id: objectIdSchema,
  tipo: z.enum(TIPOS_NOTIFICACAO),
  titulo: z.string(),
  mensagem: z.string(),
  lida: z.boolean(),
  referencia_tipo: z.string().nullable().optional(),
  referencia_id: z.string().nullable().optional(),
  data_criacao: z.string().datetime(),
  data_atualizacao: z.string().datetime(),
}).strict();
