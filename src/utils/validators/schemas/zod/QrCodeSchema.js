import { z } from 'zod';
export { QrCodeQuerySchema } from './querys/QrCodeQuerySchema.js';

export const QrCodeCriarSchema = z.object({
    filaId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'filaId inválido'),
});

// Schema de resposta — o que a API retorna num GET
export const QrCodeResponseSchema = z.object({
    _id: z.string(),
    filaId: z.string(),
    codigo: z.string(),
    validoAte: z.string().datetime(),
    toleranciaAte: z.string().datetime(),
    ativo: z.boolean(),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
}).strict();


