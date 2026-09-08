import { z } from "zod-v3";
import objectIdSchema from "./ObjectIdSchema.js";
export {
  AdministracaoUsuarioQuerySchema,
  UsuarioIdSchema,
  UsuarioQuerySchema,
} from "./querys/UsuarioQuerySchema.js";

const senhaRegex =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

const UsuarioSchema = z
  .object({
    nome: z.string().min(3, "Nome deve ter no mínimo 3 caracteres."),
    email: z
      .string()
      .email("Formato de email inválido.")
      .min(1, "Campo email é obrigatório."),
    cpf: z.string().min(11, "CPF inválido."),
    senha: z
      .string()
      .min(8, "A senha deve ter pelo menos 8 caracteres.")
      .refine((s) => senhaRegex.test(s), {
        message:
          "A senha deve conter pelo menos 1 letra maiúscula, 1 letra minúscula, 1 número e 1 caractere especial.",
      }),
    cidade: z.string().min(2, "Cidade é obrigatória."),
    uf: z.string().length(2, "UF deve ter 2 caracteres.").toUpperCase(),
    telefone: z.string().optional(),
    bio: z.string().max(500).optional(),
  })
  .strict();

const UsuarioUpdateSchema = UsuarioSchema.omit({ senha: true, cpf: true })
  .partial()
  .extend({
    senha: z
      .string()
      .min(8, "A senha deve ter pelo menos 8 caracteres.")
      .refine((s) => senhaRegex.test(s), {
        message:
          "A senha deve conter pelo menos 1 letra maiúscula, 1 letra minúscula, 1 número e 1 caractere especial.",
      })
      .optional(),
    foto_perfil: z.string().optional(),
  })
  .strict();

const UsuarioLoginSchema = z.object({
  email: z.string().email("Formato de email inválido.").min(1),
  senha: z.string().min(1, "Senha é obrigatória."),
});

const UsuarioEsqueciSenhaSchema = z.object({
  email: z.string().email("Formato de email inválido.").min(1),
});

const UsuarioRedefinirSenhaSchema = z.object({
  token: z.string().min(1, "Token é obrigatório."),
  novaSenha: z
    .string()
    .min(8, "A senha deve ter pelo menos 8 caracteres.")
    .refine((s) => senhaRegex.test(s), {
      message:
        "A senha deve conter pelo menos 1 letra maiúscula, 1 letra minúscula, 1 número e 1 caractere especial.",
    }),
});

const UsuarioExcluirSchema = z.object({
  senha: z.string().min(1, "Senha é obrigatória."),
});

const UsuarioSuspenderSchema = z.object({
  motivo: z.string().min(3, "Motivo é obrigatório."),
  suspensao_ate: z.string().min(1, "Data de suspensão é obrigatória."),
});

const UsuarioResponseSchema = z
  .object({
    _id: objectIdSchema,
    nome: z.string(),
    email: z.string().email(),
    cpf: z.string(),
    cidade: z.string(),
    uf: z.string(),
    email_verificado: z.boolean(),
    telefone: z.string().nullable().optional(),
    foto_perfil: z.string().nullable().optional(),
    bio: z.string().nullable().optional(),
    perfil: z.enum(["USUARIO", "ADMINISTRADOR"]),
    situacao: z.enum(["ATIVO", "SUSPENSO", "INATIVO"]),
    motivo_suspensao: z.string().nullable().optional(),
    suspensao_ate: z.string().datetime().nullable().optional(),
    media_avaliacoes: z.number(),
    total_avaliacoes: z.number(),
    total_doacoes: z.number(),
    data_cadastro: z.string().datetime(),
    data_atualizacao: z.string().datetime(),
  })
  .strict();

export {
  UsuarioSchema,
  UsuarioUpdateSchema,
  UsuarioLoginSchema,
  UsuarioEsqueciSenhaSchema,
  UsuarioRedefinirSenhaSchema,
  UsuarioExcluirSchema,
  UsuarioSuspenderSchema,
  UsuarioResponseSchema,
};

const UsuarioSeedSchema = z
  .object({
    nome: z.string().min(1, "nome é obrigatório"),
    email: z.string().email("email inválido"),
    cpf: z.string().min(11, "cpf é obrigatório"),
    senha: z.string().min(1, "senha é obrigatória"),
    cidade: z.string().min(1, "cidade é obrigatória"),
    uf: z.string().length(2, "uf deve ter 2 caracteres"),
    telefone: z.string().nullable(),
    foto_perfil: z.string().nullable(),
    bio: z.string().nullable(),
    perfil: z.enum(["USUARIO", "ADMINISTRADOR"]),
    situacao: z.enum(["ATIVO", "SUSPENSO", "INATIVO"]),
    motivo_suspensao: z.string().nullable(),
    suspensao_ate: z.date().nullable(),
    email_verificado: z.boolean(),
    media_avaliacoes: z.number(),
    total_avaliacoes: z.number(),
    total_doacoes: z.number(),
  })
  .strict();

export { UsuarioSeedSchema };
