import { z } from "zod-v3";
import { isEntityId } from "./ObjectIdSchema.js";
export { AvaliacaoIdSchema, AvaliacaoQuerySchema } from "./querys/AvaliacaoQuerySchema.js";

const AvaliacaoSchema = z.object({
  item_id: z.string()
    .refine((v) => isEntityId(v), { message: "item_id inválido" }),
  avaliado_id: z.string()
    .refine((v) => isEntityId(v), { message: "avaliado_id inválido" }),
  nota: z.number().int()
    .min(1, "Nota mínima é 1")
    .max(5, "Nota máxima é 5"),
  comentario: z.string().optional(),
  tipo: z.enum(["DOADOR_PARA_INTERESSADO", "INTERESSADO_PARA_DOADOR"], {
    errorMap: () => ({ message: "tipo deve ser DOADOR_PARA_INTERESSADO ou INTERESSADO_PARA_DOADOR" }),
  }),
}).strict();

const AvaliacaoUpdateSchema = z.object({
  nota: z.number().int()
    .min(1, "Nota mínima é 1")
    .max(5, "Nota máxima é 5")
    .optional(),
  comentario: z.string().trim().optional().nullable(),
})
  .strict()
  .refine((data) => data.nota !== undefined || data.comentario !== undefined, {
    message: "Informe ao menos um campo para atualizar a avaliação.",
  });

const AvaliacaoResponseSchema = z.object({
  _id:            z.string(),
  item_id:        z.string(),
  avaliador_id:   z.string(),
  avaliado_id:    z.string(),
  nota:           z.number().int(),
  comentario:     z.string().nullable().optional(),
  tipo:           z.enum(["DOADOR_PARA_INTERESSADO", "INTERESSADO_PARA_DOADOR"]),
  data_avaliacao: z.string().datetime(),
}).strict();

export { AvaliacaoSchema, AvaliacaoUpdateSchema, AvaliacaoResponseSchema };
