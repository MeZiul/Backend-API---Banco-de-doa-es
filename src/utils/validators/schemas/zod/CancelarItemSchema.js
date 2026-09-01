import { z } from 'zod-v3'

export const cancelarItemSchema = z.object({
    motivo: z.string({
        required_error: "O motivo do cancelamento é obrigatório."
    }).min(10, "O motivo deve ter pelo menos 10 caracteres.")
});
