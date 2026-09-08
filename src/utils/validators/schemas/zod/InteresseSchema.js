import { z } from "zod-v3";
import objectIdSchema from "./ObjectIdSchema.js";

export { InteresseIdSchema, InteresseQuerySchema } from "./querys/InteresseQuerySchema.js";

const STATUS_INTERESSE = ["PENDENTE", "ACEITO", "RECUSADO", "CANCELADO", "EXPIRADO"];

const optionalNullableText = z.string()
  .trim()
  .optional()
  .nullable()
  .refine((value) => value == null || value.length > 0, {
    message: "O campo não pode ser vazio quando informado.",
  });

const InteresseSchema = z.object({
  item_id: objectIdSchema.optional(),
  itemId: objectIdSchema.optional(),
  mensagem: optionalNullableText,
  mensagem_interessado: optionalNullableText,
  mensagemInteressado: optionalNullableText,
})
  .superRefine((data, ctx) => {
    if (!data.item_id && !data.itemId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["item_id"],
        message: "item_id é obrigatório.",
      });
    }
  })
  .transform((data) => ({
    item_id: data.item_id ?? data.itemId,
    mensagem_interessado: data.mensagem_interessado ?? data.mensagemInteressado ?? data.mensagem ?? null,
  }));

const InteresseRespostaSchema = z.object({
  mensagemResposta: optionalNullableText,
  resposta_doador: optionalNullableText,
  respostaDoador: optionalNullableText,
}).transform((data) => ({
  resposta_doador: data.resposta_doador ?? data.respostaDoador ?? data.mensagemResposta ?? null,
}));

const InteresseResponseSchema = z.object({
  _id: objectIdSchema,
  item_id: objectIdSchema,
  usuario_interessado_id: objectIdSchema,
  usuario_doador_id: objectIdSchema,
  mensagem_interessado: z.string().nullable().optional(),
  resposta_doador: z.string().nullable().optional(),
  status: z.enum(STATUS_INTERESSE),
  data_interesse: z.string().datetime(),
  data_resposta: z.string().datetime().nullable().optional(),
  data_cancelamento: z.string().datetime().nullable().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
}).strict();

export {
  InteresseSchema,
  InteresseRespostaSchema,
  InteresseResponseSchema,
};
