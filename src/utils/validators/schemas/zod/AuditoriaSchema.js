// src/utils/validators/schemas/zod/AuditoriaSchema.js
import { z } from 'zod';
import { AUDITORIA_ACOES, AUDITORIA_ENTIDADES } from '../../../../constants/auditoria.js';
export { AuditoriaQuerySchema } from './querys/AuditoriaQuerySchema.js';

const AUDITORIA_ACOES_ENUM = Object.values(AUDITORIA_ACOES);
const AUDITORIA_ENTIDADES_ENUM = Object.values(AUDITORIA_ENTIDADES);

// Schema de resposta — o que a API retorna num GET
export const AuditoriaResponseSchema = z.object({
    _id: z.string(),
    instituicaoId: z.string().nullable().optional(),
    usuarioId: z.string().nullable().optional(),
    acao: z.enum(AUDITORIA_ACOES_ENUM),
    entidade: z.enum(AUDITORIA_ENTIDADES_ENUM),
    entidadeId: z.string().nullable().optional(),
    dados: z.record(z.unknown()).nullable().optional(),
    criadoEm: z.string().datetime(),
}).strict();


