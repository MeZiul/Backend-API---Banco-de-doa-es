import { z } from "zod-v3";
import objectIdSchema from "./ObjectIdSchema.js";

export { DenunciaIdSchema, DenunciaQuerySchema } from "./querys/DenunciaQuerySchema.js";

const TIPOS_ALVO = ["ITEM", "USUARIO"];
const MOTIVOS_DENUNCIA = [
  "CONTEUDO_INAPROPRIADO",
  "ITEM_PROIBIDO",
  "FRAUDE",
  "ASSEDIO",
  "SPAM",
  "OUTRO",
];
const STATUS_DENUNCIA = ["EM_ANALISE", "PROCEDENTE", "IMPROCEDENTE"];

const optionalNullableText = z.string()
  .trim()
  .optional()
  .nullable()
  .refine((value) => value == null || value.length > 0, {
    message: "O campo não pode ser vazio quando informado.",
  });

const denunciaBaseObject = z.object({
  tipo_alvo: z.enum(TIPOS_ALVO).optional(),
  tipoAlvo: z.enum(TIPOS_ALVO).optional(),
  alvo_item_id: objectIdSchema.optional(),
  alvoItemId: objectIdSchema.optional(),
  alvo_usuario_id: objectIdSchema.optional(),
  alvoUsuarioId: objectIdSchema.optional(),
  motivo: z.enum(MOTIVOS_DENUNCIA, {
    errorMap: () => ({ message: "Motivo de denúncia inválido." }),
  }),
  descricao: optionalNullableText,
});

const DenunciaSchema = denunciaBaseObject
  .superRefine((data, ctx) => {
    const tipoAlvo = data.tipo_alvo ?? data.tipoAlvo;

    if (!tipoAlvo) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["tipo_alvo"],
        message: "tipo_alvo é obrigatório.",
      });
      return;
    }

    if (tipoAlvo === "ITEM" && !data.alvo_item_id && !data.alvoItemId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["alvo_item_id"],
        message: "alvo_item_id é obrigatório quando o tipo_alvo for ITEM.",
      });
    }

    if (tipoAlvo === "USUARIO" && !data.alvo_usuario_id && !data.alvoUsuarioId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["alvo_usuario_id"],
        message: "alvo_usuario_id é obrigatório quando o tipo_alvo for USUARIO.",
      });
    }
  })
  .transform((data) => ({
    tipo_alvo: data.tipo_alvo ?? data.tipoAlvo,
    alvo_item_id: data.alvo_item_id ?? data.alvoItemId ?? null,
    alvo_usuario_id: data.alvo_usuario_id ?? data.alvoUsuarioId ?? null,
    motivo: data.motivo,
    descricao: data.descricao ?? null,
  }));

const DenunciaUpdateSchema = z.object({
  motivo: z.enum(MOTIVOS_DENUNCIA).optional(),
  descricao: optionalNullableText,
}).refine((data) => data.motivo !== undefined || data.descricao !== undefined, {
  message: "Informe ao menos um campo para atualizar a denúncia.",
});

const DenunciaResponseSchema = z.object({
  _id: objectIdSchema,
  denunciante_id: objectIdSchema,
  tipo_alvo: z.enum(TIPOS_ALVO),
  alvo_item_id: objectIdSchema.nullable().optional(),
  alvo_usuario_id: objectIdSchema.nullable().optional(),
  motivo: z.enum(MOTIVOS_DENUNCIA),
  descricao: z.string().nullable().optional(),
  status: z.enum(STATUS_DENUNCIA),
  resposta_admin: z.string().nullable().optional(),
  admin_id: objectIdSchema.nullable().optional(),
  acao_tomada: z.string().nullable().optional(),
  data_denuncia: z.string().datetime(),
  data_analise: z.string().datetime().nullable().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
}).strict();

export {
  DenunciaSchema,
  DenunciaUpdateSchema,
  DenunciaResponseSchema,
};
