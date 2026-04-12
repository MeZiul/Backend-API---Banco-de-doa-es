import { z } from 'zod';
import { SENHA_STATUS_ENUM, SENHA_PRIORIDADE_ENUM } from '../../../../constants/senha.js';
export { SenhaQuerySchema } from './querys/SenhaQuerySchema.js';

export const SenhaCriarSchema = z.object({
    qrCode: z.string().min(1, 'QR Code não pode ser vazio').optional(),
    prioridade: z.enum(SENHA_PRIORIDADE_ENUM).optional(),
});

// Schema de resposta — o que a API retorna num GET
export const SenhaResponseSchema = z.object({
    _id: z.string(),
    filaId: z.string(),
    instituicaoId: z.string(),
    usuarioId: z.string().nullable().optional(),
    nomeCidadao: z.string().nullable().optional(),
    presencial: z.boolean().optional(),
    numero: z.number().int().nullable().optional(),
    posicao: z.number().int(),
    status: z.enum(SENHA_STATUS_ENUM),
    prioridade: z.string().nullable().optional(),
    prioridadePeso: z.number().int().optional(),
    mesa: z.string().nullable().optional(),
    mesaNome: z.string().nullable().optional(),
    operadorId: z.string().nullable().optional(),
    tokenPublico: z.string().nullable().optional(),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
}).strict();


