import { z } from 'zod'

export const gerenciarPerfilSchema = z.object({
    perfil: z.enum (['USUARIO', 'ADMINISTRADOR'], {
        errorMap: () => ({
            message: "Perfil de acesso inválido. Use USUARIO ou ADMINISTRADOR."
        })
    }).optional(),
    situacao: z.enum (['ATIVO', 'SUSPENSO', 'INATIVO'], {
        errorMap: () => ({message: "Situação inválida. Use ATIVO, SUSPENSO ou INATIVO."})
    }).optional()
});