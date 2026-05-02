import { z } from "zod";

export const NotificacaoQuerySchema = z.object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().positive().max(100).default(20),
});