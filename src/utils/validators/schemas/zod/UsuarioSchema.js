// src/utils/validators/schemas/zod/UsuarioSchema.js

import { z } from 'zod';
import { PAPEIS_ENUM } from '../../../../constants/roles.js';
import objectIdSchema from './ObjectIdSchema.js';
export { UsuarioIdSchema, UsuarioQuerySchema } from './querys/UsuarioQuerySchema.js';

const senhaRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

const UsuarioSchema = z.object({
  nome: z.string().min(1, 'Campo nome é obrigatório.'),
  email: z
    .string()
    .email('Formato de email inválido.')
    .min(1, 'Campo email é obrigatório.'),
  senha: z
    .string()
    .min(8, 'A senha deve ter pelo menos 8 caracteres.')
    .refine(
      (senha) => senhaRegex.test(senha),
      {
        message:
          'A senha deve conter pelo menos 1 letra maiúscula, 1 letra minúscula, 1 número e 1 caractere especial.',
      }
    )
    .optional(),
  papeis: z
    .array(z.enum(PAPEIS_ENUM, {
      errorMap: () => ({ message: `Papel deve ser um de: ${PAPEIS_ENUM.join(', ')}` }),
    }))
    .min(1, 'Ao menos um papel é obrigatório.'),
  ativo: z.boolean().default(true),
});

const UsuarioUpdateSchema = UsuarioSchema.omit({ senha: true }).partial().extend({
  senha: z
    .string()
    .min(8, 'A senha deve ter pelo menos 8 caracteres.')
    .refine(
      (senha) => senhaRegex.test(senha),
      {
        message:
          'A senha deve conter pelo menos 1 letra maiúscula, 1 letra minúscula, 1 número e 1 caractere especial.',
      }
    )
    .optional(),
  instituicaoId: z.string().min(1).optional().nullable(),
});



// Schema de resposta — define exatamente o que a API expõe (nunca senha/tokens)
// .strict() garante que campos novos do model não passem silenciosamente:
// se um campo público for adicionado ao model e não ao schema, o teste de paridade falha.
const UsuarioResponseSchema = z.object({
  _id: objectIdSchema,
  nome: z.string(),
  email: z.string().email(),
  papeis: z.array(z.enum(PAPEIS_ENUM)),
  ativo: z.boolean(),
  avatar: z.string().nullable().optional(),
  instituicaoId: objectIdSchema.nullable().optional(),
  ultimoLoginEm: z.string().datetime().nullable().optional(),
  fusoHorario: z.string().optional(),
  provider: z.string().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
}).strict();

export { UsuarioSchema, UsuarioUpdateSchema, UsuarioResponseSchema };

// Schema de seed — espelha TODOS os campos do model Usuario.
//
// Regras:
//   - Campos nullable  → z.xxx().nullable()        (obrigatório, mas pode ser null)
//   - Campos opcionais → z.xxx().nullable()         (seed deve ser explícito sobre tudo)
//   - Campos de auth gerenciados pelo sistema → null em seed, mas DECLARADOS aqui
//   - .strict() → se o model ganhar um campo novo e o seed não declarar, falha na hora
//
// QUANDO adicionar um campo ao model Usuario.js:
//   1. Adicione-o aqui com o tipo correto
//   2. Adicione-o nos dados do buildUsuariosFixos / buildUsuariosAleatorios
//   3. Decida se vai para UsuarioResponseSchema (público) ou CAMPOS_INTERNOS (infra)
const UsuarioSeedSchema = z.object({
  nome:                     z.string().min(1, 'nome é obrigatório'),
  email:                    z.string().email('email inválido'),
  senhaHash:                z.string().min(1, 'senhaHash é obrigatório'),
  googleId:                 z.string().nullable(),
  provider:                 z.enum(['local', 'google']),
  papeis:                   z.array(z.enum(PAPEIS_ENUM)).min(1, 'ao menos um papel é obrigatório'),
  instituicaoId:            z.any().nullable(),           // ObjectId | null
  ativo:                    z.boolean(),
  avatar:                   z.string().nullable(),
  fusoHorario:              z.string(),
  accesstoken:              z.string().nullable(),
  refreshtoken:             z.string().nullable(),
  tokenUnico:               z.string().nullable(),
  codigo_recupera_senha:    z.string().nullable(),
  exp_codigo_recupera_senha: z.date().nullable(),
  ultimoLoginEm:            z.date().nullable(),
}).strict();

export { UsuarioSeedSchema };
