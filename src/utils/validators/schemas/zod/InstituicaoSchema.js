import { z } from 'zod';
export { InstituicaoQuerySchema } from './querys/InstituicaoQuerySchema.js';

export const InstituicaoSchema = z.object({
    nome: z.string().min(1, 'Campo nome é obrigatório.'),
    cnpj: z.string().min(14, 'CNPJ é obrigatório.').max(18),
    email: z.string().email('E-mail inválido.'),
    telefone: z.string().min(10, 'Telefone é obrigatório.').max(20),
    responsavel: z.string().min(2, 'Nome do responsável é obrigatório.'),
    endereco: z.string().min(5, 'Endereço é obrigatório.'),
    descricao: z.string().max(500).optional().default(''),
    ativo: z.boolean().default(true),
    configuracoes: z.record(z.unknown()).default({}),
});

export const InstituicaoUpdateSchema = InstituicaoSchema.partial();

// Schema para solicitação pública de nova instituição
export const InstituicaoSolicitacaoSchema = z.object({
    nome: z.string().min(2, 'Nome da instituição é obrigatório (mín. 2 caracteres).'),
    cnpj: z.string().min(14, 'CNPJ é obrigatório.').max(18),
    email: z.string().email('E-mail inválido.'),
    telefone: z.string().min(10, 'Telefone é obrigatório.').max(20),
    responsavel: z.string().min(2, 'Nome do responsável é obrigatório.'),
    endereco: z.string().min(5, 'Endereço é obrigatório.'),
    descricao: z.string().max(500).optional().default(''),
});

// Schema para aprovação (admin)
export const InstituicaoAprovacaoSchema = z.object({
    observacao: z.string().optional().default(''),
});

// Schema para rejeição (admin)
export const InstituicaoRejeicaoSchema = z.object({
    motivoRejeicao: z.string().min(5, 'Informe o motivo da rejeição (mín. 5 caracteres).'),
});

// Schema de resposta — o que a API retorna num GET
export const InstituicaoResponseSchema = z.object({
    _id: z.string(),
    nome: z.string(),
    cnpj: z.string(),
    email: z.string().email(),
    telefone: z.string(),
    responsavel: z.string(),
    endereco: z.string(),
    descricao: z.string().optional(),
    ativo: z.boolean(),
    status: z.enum(['PENDENTE', 'APROVADA', 'REJEITADA']).optional(),
    configuracoes: z.record(z.unknown()).optional(),
    solicitanteId: z.string().nullable().optional(),
    contratoUrl: z.string().nullable().optional(),
    motivoRejeicao: z.string().optional(),
    aprovadoPor: z.string().nullable().optional(),
    aprovadoEm: z.string().datetime().nullable().optional(),
    tiposEtapa: z.array(z.object({
        codigo: z.string(),
        nome: z.string(),
        cor: z.string().optional(),
        ativo: z.boolean().optional(),
    })).optional(),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
}).strict();


