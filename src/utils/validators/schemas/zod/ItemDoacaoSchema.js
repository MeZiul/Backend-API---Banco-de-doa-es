import { z } from "zod-v3";
import objectIdSchema from "./ObjectIdSchema.js";

export const itemDoacaoSchema = z.object({
    titulo: z.string()
        .min(3, "O título deve ter pelo menos 3 caracteres.")
        .max(100, "Otítulo é muito longo."),

    descricao: z.string()
        .min(10, "A descrição deve ser detalhada (mínico 10 caracteres).")
        .max(2000, "A descrição excedeu o limete de caracteres."),

    categoria_id: z.string({required_error: "A categoria é obrigatória."}),

    condicao_item: z.enum(["NOVO", "SEMINOVO", "USADO_BOM", "USADO_REGULAR"], {
        errorMap: () => ({ message: "Condição do item inválida."})
    }),

    cidade: z.string().optional(),
    uf: z.string().length(2, "UF deve ter exatamente 2 caracteres.").toUpperCase().optional(),
    bairro: z.string().optional(),

    condicoes_doacao: z.string().max(500).optional()

});

const fotoItemDoacaoResponseSchema = z.object({
  _id: objectIdSchema,
  item_id: objectIdSchema,
  url: z.string(),
  ordem: z.number().int(),
  nome_original: z.string().nullable().optional(),
  tamanho: z.number().int().nullable().optional(),
  mime_type: z.string().nullable().optional(),
  data_upload: z.string().datetime(),
}).strict();

export const ItemDoacaoResponseSchema = z.object({
  _id: objectIdSchema,
  usuario_id: objectIdSchema,
  categoria_id: objectIdSchema,
  interesse_aceito_id: objectIdSchema.nullable().optional(),
  titulo: z.string(),
  descricao: z.string(),
  condicao_item: z.enum(["NOVO", "SEMINOVO", "USADO_BOM", "USADO_REGULAR"]),
  cidade: z.string(),
  uf: z.string(),
  bairro: z.string().nullable().optional(),
  condicoes_doacao: z.string().nullable().optional(),
  status: z.enum([
    "DISPONIVEL",
    "RESERVADO",
    "AGUARDANDO_CONFIRMACAO",
    "DOADO",
    "CANCELADO",
  ]),
  motivo_cancelamento: z.string().nullable().optional(),
  data_doacao: z.string().datetime().nullable().optional(),
  visualizacoes: z.number().int(),
  total_interesses: z.number().int(),
  data_cadastro: z.string().datetime(),
  data_atualizacao: z.string().datetime(),
  fotos: z.array(fotoItemDoacaoResponseSchema),
}).strict();
