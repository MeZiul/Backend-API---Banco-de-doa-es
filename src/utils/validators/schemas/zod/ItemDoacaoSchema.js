import { z } from "zod"

// Campos obrigatórios
export const itemDoacaoSchema = z.object({
    titulo: z.string()
        .min(3, "O título deve ter pelo menos 3 caracteres.")
        .max(100, "Otítulo é muito longo."),

    descricao: z.string()
        .min(10, "A descrição deve ser detalhada (mínico 10 caracteres).")
        .max(2000, "A descrição excedeu o limete de caracteres."),

    categoria_id: z.string({required_error: "A categoria é obrigatória."}),

    // Condições permitidas
    condicao_item: z.enum(["NOVO", "SEMINOVO", "USADO_BOM", "USADO_REGULAR"], {
        errorMap: () => ({ message: "Condição do item inválida."})
    }),

    // Cidade e Estado podem ser omitidos
    cidade: z.string().optional(),
    uf: z.string().length(2, "UF deve ter exatamente 2 caracteres.").toUpperCase().optional(),
    bairro: z.string().optional(),

    // Condição específica
    condicoes_doacao: z.string().max(500).optional()

})