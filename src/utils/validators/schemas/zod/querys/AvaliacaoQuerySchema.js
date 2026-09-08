import { z } from "zod-v3";
import { isEntityId } from "../ObjectIdSchema.js";

export const AvaliacaoIdSchema = z.string().refine(
  (id) => isEntityId(id),
  { message: "ID inválido" }
);

export const AvaliacaoQuerySchema = z.object({
  avaliado_id: z.string().optional()
    .refine((v) => !v || isEntityId(v), { message: "avaliado_id inválido" }),
  avaliador_id: z.string().optional()
    .refine((v) => !v || isEntityId(v), { message: "avaliador_id inválido" }),
  item_id: z.string().optional()
    .refine((v) => !v || isEntityId(v), { message: "item_id inválido" }),
  tipo: z.string().optional()
    .refine((v) => !v || ["DOADOR_PARA_INTERESSADO", "INTERESSADO_PARA_DOADOR"].includes(v), {
      message: "tipo deve ser DOADOR_PARA_INTERESSADO ou INTERESSADO_PARA_DOADOR",
    }),
  page: z.string().optional()
    .transform((v) => (v ? parseInt(v, 10) : 1))
    .refine((v) => Number.isInteger(v) && v > 0, { message: "page deve ser inteiro > 0" }),
  limite: z.string().optional()
    .transform((v) => (v ? parseInt(v, 10) : 20))
    .refine((v) => Number.isInteger(v) && v > 0 && v <= 100, { message: "limite deve ser entre 1 e 100" }),
});
