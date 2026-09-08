import { z } from "zod-v3";
import { isEntityId } from "../ObjectIdSchema.js";

const isValidDate = (value) => !value || !Number.isNaN(new Date(value).getTime());
const isValidEntityId = (value) => !value || isEntityId(value);
const periodoAdministrativo = {
    dataInicio: z.string().optional()
        .refine(isValidDate, { message: "dataInicio inválida" }),
    dataFim: z.string().optional()
        .refine(isValidDate, { message: "dataFim inválida" }),
};

export const itemDoacaoQuerySchema = z.object({
    //Paginaão
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(20),

    //Busca textual e filtros combinados
    busca: z.string().optional(),
    categoria_id: z.string().optional()
        .refine(isValidEntityId, { message: "categoria_id inválido" }),
    categoriaId: z.string().optional()
        .refine(isValidEntityId, { message: "categoriaId inválido" }),
    usuario_id: z.string().optional()
        .refine(isValidEntityId, { message: "usuario_id inválido" }),
    usuarioId: z.string().optional()
        .refine(isValidEntityId, { message: "usuarioId inválido" }),
    cidade: z.string().optional(),
    uf: z.coerce.string().length(2).toUpperCase().optional(),
    status: z.enum(["DISPONIVEL", "RESERVADO", "AGUARDANDO_CONFIRMACAO", "DOADO", "CANCELADO"]).optional(),
    condicao_item: z.enum(["NOVO", "SEMINOVO", "USADO_BOM", "USADO_REGULAR"]).optional(),
    condicaoItem: z.enum(["NOVO", "SEMINOVO", "USADO_BOM", "USADO_REGULAR"]).optional(),

    //Ordenação suportada.
    ordenacao: z.enum(["recentes", "antigos", "visualizados", "interessados"]).default("recentes")
});

export const administracaoItemDoacaoQuerySchema = itemDoacaoQuerySchema.extend(periodoAdministrativo);
