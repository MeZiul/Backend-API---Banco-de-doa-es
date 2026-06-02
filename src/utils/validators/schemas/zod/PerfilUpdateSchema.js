import { z } from 'zod';

export const perfilUpdateSchema = z.object({
    nome: z.string().min(3, "O nome deve ter pelo menos 3 caracteres").optional(),
    telefone: z.string().regex(/^\(?\d{2}\)?\s?\d{4,5}-?\d{4}$/, "Formato de telefone inválido.").optional(),
    bio: z.string().max(500, "A biografia não pode passar de 500 caracteres").optional(),
    cidade: z.string().min(2, "A cidade deve ter pelo menos 2 caracteres").optional(),
    uf: z.string().length(2, "A UF deve ter exatamente 2 caracteres").toUpperCase().optional(),
    foto_url: z.string().optional()
});