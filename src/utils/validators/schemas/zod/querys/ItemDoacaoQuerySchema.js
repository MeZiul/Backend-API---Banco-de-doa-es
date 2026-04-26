import { z } from "zod";

export const itemDoacaoQuerySchema = z.object({
    //Paginaão
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(20),

    //Busca textual e filtros combinados
    busca: z.string().optional(),
    categoria_id: z.string().optional(),
    cidade: z.string().optional(),
    uf: z.coerce.string().length(2).toUpperCase().optional(),
    condicao_item: z.enum(["NOVO", "SEMINOVO", "USADO_BOM", "USADO_REGULAR"]).optional(),

    //Ordenação suportada.
    ordenacao: z.enum(["recentes", "antigos", "visualizados", "interessados"]).default("recentes")
});