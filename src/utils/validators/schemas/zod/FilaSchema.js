import { z } from 'zod';
import { TIPO_ATENDIMENTO_ENUM, QR_CODE_DEFAULTS, MODO_QRCODE_ENUM } from '../../../../constants/fila.js';
export { FilaQuerySchema } from './querys/FilaQuerySchema.js';

const MesaSchema = z.object({
    numero: z.string().min(1, 'Número da estação é obrigatório'),
    nome: z.string().nullable().optional(),
    ativa: z.boolean().default(true),
});

export const FilaSchema = z.object({
    nome: z.string().min(1, 'Campo nome é obrigatório.'),
    tipoAtendimento: z.enum(TIPO_ATENDIMENTO_ENUM, {
        errorMap: () => ({ message: 'tipoAtendimento deve ser ONLINE, PRESENCIAL ou HIBRIDO' }),
    }),
    ativa: z.boolean().default(true),
    prioridadesHabilitadas: z.boolean().default(false),
    fidelidadeHabilitada: z.boolean().default(false),
    tempoMaximoAtendimento: z.number().int().positive().nullable().optional(),
    configuracaoQRCode: z.object({
        modoQRCode: z.enum(MODO_QRCODE_ENUM).optional().default('ROTATIVO'),
        tempoExibicaoMin: z.number().int().min(1).max(60).optional().default(QR_CODE_DEFAULTS.TEMPO_EXIBICAO_MIN),
        tempoExpiracaoMin: z.number().int().positive().optional(),
        toleranciaMin: z.number().int().nonnegative().optional(),
        tempoAlertaSegundos: z.number().int().min(5).max(120).optional().default(30),
    }).nullable().optional().default(null),
    mesas: z.array(MesaSchema).optional().default([]),
    // Flow de Atendimento (gerenciado via FlowService, exposto para desvinculação)
    flowId: z.string().regex(/^[0-9a-fA-F]{24}$/).nullable().optional(),
    flowStepId: z.string().regex(/^[0-9a-fA-F]{24}$/).nullable().optional(),
    flowStepTipo: z.string().nullable().optional(),
    isEntradaFlow: z.boolean().optional(),
});

export const FilaUpdateSchema = FilaSchema.partial();

// Schema da mesa para respostas
const MesaResponseSchema = z.object({
    numero: z.string(),
    nome: z.string().nullable().optional(),
    ativa: z.boolean(),
});

// Schema de resposta — o que a API retorna num GET
export const FilaResponseSchema = z.object({
    _id: z.string(),
    nome: z.string(),
    tipoAtendimento: z.enum(TIPO_ATENDIMENTO_ENUM),
    ativa: z.boolean(),
    prioridadesHabilitadas: z.boolean(),
    fidelidadeHabilitada: z.boolean(),
    tempoMaximoAtendimento: z.number().nullable().optional(),
    configuracaoQRCode: z.object({
        modoQRCode: z.enum(MODO_QRCODE_ENUM).optional(),
        tempoExibicaoMin: z.number().int().optional(),
        tempoExpiracaoMin: z.number().int().optional(),
        toleranciaMin: z.number().int().optional(),
        tempoAlertaSegundos: z.number().int().optional(),
    }).nullable().optional(),
    mesas: z.array(MesaResponseSchema).optional(),
    instituicaoId: z.string(),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
}).strict();


