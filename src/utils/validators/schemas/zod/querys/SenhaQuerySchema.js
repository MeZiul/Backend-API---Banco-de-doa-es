// src/utils/validators/schemas/zod/querys/SenhaQuerySchema.js

import { z } from 'zod';
import { SENHA_STATUS_ENUM, SENHA_PRIORIDADE_ENUM } from '../../../../../constants/senha.js';

export const SenhaQuerySchema = z.object({
    filaId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'filaId inválido').optional(),
    instituicaoId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'instituicaoId inválido').optional(),
    flowId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'flowId inválido').optional(),
    flowStepAtualId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'flowStepAtualId inválido').optional(),
    status: z.enum(SENHA_STATUS_ENUM).optional(),
    statusIn: z.string().optional()
        .transform((v) => v ? v.split(',').filter((s) => SENHA_STATUS_ENUM.includes(s)) : undefined),
    prioridade: z.enum(SENHA_PRIORIDADE_ENUM).optional(),
    dataInicio: z.string().optional(),
    dataFim: z.string().optional(),
    page: z.string().optional()
        .transform((v) => (v ? parseInt(v, 10) : 1))
        .refine((v) => Number.isInteger(v) && v > 0, { message: 'page deve ser inteiro > 0' }),
    limit: z.string().optional()
        .transform((v) => (v ? parseInt(v, 10) : 10))
        .refine((v) => Number.isInteger(v) && v > 0 && v <= 100, { message: 'limit deve ser entre 1 e 100' }),
});
