import { z } from 'zod-v3';

export const atualizarPerfilSchema = z.object({
    nome: z.string().min(3, "Nome deve ter no mínimo 3 caracteres.").optional(),
    email: z.string().email("Formato de email inválido.").optional(),
    cidade: z.string().min(2, "Cidade é obrigatória.").optional(),
    uf: z.string().length(2, "UF deve ter 2 caracteres.").transform((uf) => uf.toUpperCase()).optional(),
    telefone: z.string().optional(),
    foto_perfil: z.string().optional(),
    bio: z.string().max(500, "Bio deve ter no máximo 500 caracteres.").optional(),
}).strict().refine((dados) => Object.keys(dados).length > 0, {
    message: "Informe ao menos um campo para atualizar o perfil.",
});

export const gerenciarPerfilSchema = z.object({
    perfil: z.enum(['USUARIO', 'ADMINISTRADOR'], {
        errorMap: () => ({ message: "Perfil de acesso inválido. Use USUARIO ou ADMINISTRADOR." })
    }).optional(),
    situacao: z.enum(['ATIVO', 'SUSPENSO', 'INATIVO'], {
        errorMap: () => ({ message: "Situação inválida. Use ATIVO, SUSPENSO ou INATIVO." })
    }).optional()
});
