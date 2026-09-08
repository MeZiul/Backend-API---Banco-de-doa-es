import { z } from "zod-v3";
import objectIdSchema from "./ObjectIdSchema.js";

export { AdministracaoIdSchema, AdministracaoQuerySchema } from "./querys/AdministracaoQuerySchema.js";

const TIPOS_ACAO = [
  "BLOQUEIO_USUARIO",
  "DESBLOQUEIO_USUARIO",
  "INATIVACAO_USUARIO",
  "CANCELAMENTO_ITEM",
  "RESOLUCAO_DENUNCIA",
];

const TIPOS_ALVO = ["USUARIO", "ITEM", "DENUNCIA"];
const RESULTADOS_DENUNCIA = ["PROCEDENTE", "IMPROCEDENTE"];

const optionalTrimmedString = (max, message) =>
  z.string()
    .trim()
    .max(max, message)
    .optional()
    .nullable()
    .refine((value) => value == null || value.length > 0, {
      message: "O campo não pode ser vazio quando informado.",
    });

const optionalNullableDatetime = (fieldName) =>
  z.string()
    .datetime({ offset: true, message: `${fieldName} deve ser uma data e hora ISO 8601 válida.` })
    .optional()
    .nullable();

const administracaoBaseObject = z.object({
  justificativa: optionalTrimmedString(1000, "A justificativa deve ter no máximo 1000 caracteres."),
  suspensao_ate: optionalNullableDatetime("suspensao_ate"),
  suspensaoAte: optionalNullableDatetime("suspensaoAte"),
  resposta_admin: optionalTrimmedString(1000, "A resposta administrativa deve ter no máximo 1000 caracteres."),
  respostaAdmin: optionalTrimmedString(1000, "A resposta administrativa deve ter no máximo 1000 caracteres."),
  resposta_administrativa: optionalTrimmedString(1000, "A resposta administrativa deve ter no máximo 1000 caracteres."),
  respostaAdministrativa: optionalTrimmedString(1000, "A resposta administrativa deve ter no máximo 1000 caracteres."),
  acao_tomada: optionalTrimmedString(500, "A ação tomada deve ter no máximo 500 caracteres."),
  acaoTomada: optionalTrimmedString(500, "A ação tomada deve ter no máximo 500 caracteres."),
  resultado_denuncia: z.enum(RESULTADOS_DENUNCIA).optional(),
  resultadoDenuncia: z.enum(RESULTADOS_DENUNCIA).optional(),
  resultado: z.enum(RESULTADOS_DENUNCIA).optional(),
  status: z.enum(RESULTADOS_DENUNCIA).optional(),
});

const normalizeAdministracaoPayload = (data) => ({
  justificativa: data.justificativa ?? null,
  suspensao_ate: data.suspensao_ate ?? data.suspensaoAte ?? null,
  resposta_administrativa: data.resposta_administrativa ?? data.respostaAdministrativa ?? data.resposta_admin ?? data.respostaAdmin ?? null,
  acao_tomada: data.acao_tomada ?? data.acaoTomada ?? null,
  resultado_denuncia: data.resultado_denuncia ?? data.resultadoDenuncia ?? data.resultado ?? data.status ?? null,
});

const AdministracaoSchema = administracaoBaseObject.transform(normalizeAdministracaoPayload);

const AdministracaoBloquearUsuarioSchema = administracaoBaseObject
  .superRefine((data, ctx) => {
    if (!data.justificativa) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["justificativa"],
        message: "A justificativa é obrigatória para bloquear um usuário.",
      });
    }
  })
  .transform(normalizeAdministracaoPayload);

const AdministracaoAcaoSchema = administracaoBaseObject.transform(normalizeAdministracaoPayload);

const AdministracaoResolverDenunciaSchema = administracaoBaseObject
  .superRefine((data, ctx) => {
    const resultado = data.resultado_denuncia ?? data.resultadoDenuncia ?? data.resultado ?? data.status;

    if (!resultado) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["resultado_denuncia"],
        message: "O resultado da denúncia é obrigatório.",
      });
    }
  })
  .transform(normalizeAdministracaoPayload);

const AdministracaoResponseSchema = z.object({
  _id: objectIdSchema,
  administrador_id: objectIdSchema,
  tipo_acao: z.enum(TIPOS_ACAO),
  tipo_alvo: z.enum(TIPOS_ALVO),
  alvo_id: objectIdSchema,
  alvo_model: z.enum(["Usuario", "ItemDoacao", "Denuncia"]),
  justificativa: z.string().nullable().optional(),
  suspensao_ate: z.string().datetime().nullable().optional(),
  resultado_denuncia: z.enum(RESULTADOS_DENUNCIA).nullable().optional(),
  resposta_administrativa: z.string().nullable().optional(),
  acao_tomada: z.string().nullable().optional(),
  data_acao: z.string().datetime(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
}).strict();

export {
  AdministracaoSchema,
  AdministracaoBloquearUsuarioSchema,
  AdministracaoAcaoSchema,
  AdministracaoResolverDenunciaSchema,
  AdministracaoResponseSchema,
};
