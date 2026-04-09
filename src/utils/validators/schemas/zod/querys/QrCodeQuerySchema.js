// src/utils/validators/schemas/zod/querys/QrCodeQuerySchema.js

import { z } from 'zod';

export const QrCodeQuerySchema = z.object({
    filaId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'filaId inválido').optional(),
    ativo: z.string().optional()
        .refine((v) => !v || v === 'true' || v === 'false', { message: "ativo deve ser 'true' ou 'false'" })
        .transform((v) => v === undefined ? undefined : v === 'true'),
    page: z.string().optional()
        .transform((v) => (v ? parseInt(v, 10) : 1))
        .refine((v) => Number.isInteger(v) && v > 0, { message: 'page deve ser inteiro > 0' }),
    limit: z.string().optional()
        .transform((v) => (v ? parseInt(v, 10) : 10))
        .refine((v) => Number.isInteger(v) && v > 0 && v <= 100, { message: 'limit deve ser entre 1 e 100' }),
});
