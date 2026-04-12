// src/utils/validators/schemas/zod/querys/InstituicaoQuerySchema.js

import { z } from 'zod';

export const InstituicaoQuerySchema = z.object({
    nome: z.string().optional()
        .refine((v) => !v || v.trim().length > 0, { message: 'Nome não pode ser vazio' })
        .transform((v) => v?.trim()),
    ativo: z.string().optional()
        .refine((v) => !v || v === 'true' || v === 'false', { message: "ativo deve ser 'true' ou 'false'" })
        .transform((v) => v === undefined ? undefined : v === 'true'),
    status: z.string().optional()
        .refine((v) => !v || ['PENDENTE', 'APROVADA', 'REJEITADA'].includes(v), {
            message: "status deve ser 'PENDENTE', 'APROVADA' ou 'REJEITADA'",
        }),
    page: z.string().optional()
        .transform((v) => (v ? parseInt(v, 10) : 1))
        .refine((v) => Number.isInteger(v) && v > 0, { message: 'page deve ser inteiro > 0' }),
    limit: z.string().optional()
        .transform((v) => (v ? parseInt(v, 10) : 10))
        .refine((v) => Number.isInteger(v) && v > 0 && v <= 100, { message: 'limit deve ser entre 1 e 100' }),
});
