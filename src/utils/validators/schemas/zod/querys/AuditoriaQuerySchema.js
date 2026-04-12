// src/utils/validators/schemas/zod/querys/AuditoriaQuerySchema.js

import { z } from 'zod';
import { AUDITORIA_ACOES, AUDITORIA_ENTIDADES } from '../../../../../constants/auditoria.js';

const AUDITORIA_ACOES_ENUM = Object.values(AUDITORIA_ACOES);
const AUDITORIA_ENTIDADES_ENUM = Object.values(AUDITORIA_ENTIDADES);

export const AuditoriaQuerySchema = z.object({
    instituicaoId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'instituicaoId inválido').optional(),
    usuarioId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'usuarioId inválido').optional(),
    acao: z.enum(AUDITORIA_ACOES_ENUM).optional(),
    entidade: z.enum(AUDITORIA_ENTIDADES_ENUM).optional(),
    dataInicio: z.string().optional(),
    dataFim: z.string().optional(),
    page: z.string().optional()
        .transform((v) => (v ? parseInt(v, 10) : 1))
        .refine((v) => Number.isInteger(v) && v > 0, { message: 'page deve ser inteiro > 0' }),
    limit: z.string().optional()
        .transform((v) => (v ? parseInt(v, 10) : 20))
        .refine((v) => Number.isInteger(v) && v > 0 && v <= 100, { message: 'limit deve ser entre 1 e 100' }),
});
