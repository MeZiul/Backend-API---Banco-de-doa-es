// src/utils/validators/schemas/zod/querys/FilaQuerySchema.js

import { z } from 'zod';
import { TIPO_ATENDIMENTO_ENUM } from '../../../../../constants/fila.js';

export const FilaQuerySchema = z.object({
    instituicaoId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'instituicaoId inválido').optional(),
    flowId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'flowId inválido').optional(),
    nome: z.string().max(200).optional(),
    tipoAtendimento: z.enum(TIPO_ATENDIMENTO_ENUM).optional(),
    ativa: z.string().optional()
        .refine((v) => !v || v === 'true' || v === 'false', { message: "ativa deve ser 'true' ou 'false'" })
        .transform((v) => v === undefined ? undefined : v === 'true'),
    apenasEntrada: z.string().optional()
        .refine((v) => !v || v === 'true' || v === 'false', { message: "apenasEntrada deve ser 'true' ou 'false'" })
        .transform((v) => v === undefined ? undefined : v === 'true'),
    page: z.string().optional()
        .transform((v) => (v ? parseInt(v, 10) : 1))
        .refine((v) => Number.isInteger(v) && v > 0, { message: 'page deve ser inteiro > 0' }),
    limit: z.string().optional()
        .transform((v) => (v ? parseInt(v, 10) : 10))
        .refine((v) => Number.isInteger(v) && v > 0 && v <= 100, { message: 'limit deve ser entre 1 e 100' }),
});
