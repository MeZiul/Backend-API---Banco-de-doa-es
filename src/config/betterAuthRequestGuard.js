import { APIError, createAuthMiddleware } from "better-auth/api";
import { z } from "zod";
import UsuarioRepository from "../repositories/UsuarioRepository.js";
import { normalizarCPF, validarCPF } from "../utils/verificarCPF.js";

const UFS = new Set([
  "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA",
  "MT", "MS", "MG", "PA", "PB", "PR", "PE", "PI", "RJ", "RN",
  "RS", "RO", "RR", "SC", "SP", "SE", "TO",
]);

const strongPasswordSchema = z
  .string()
  .min(8, "A senha deve ter pelo menos 8 caracteres.")
  .max(128, "A senha deve ter no máximo 128 caracteres.")
  .regex(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,128}$/,
    "A senha deve conter pelo menos 1 letra maiúscula, 1 letra minúscula, 1 número e 1 caractere especial.",
  );

const signUpSchema = z
  .object({
    name: z.string().trim().min(3, "Nome deve ter no mínimo 3 caracteres."),
    email: z
      .string()
      .trim()
      .email("Formato de email inválido.")
      .transform((value) => value.toLowerCase()),
    password: strongPasswordSchema,
    cpf: z
      .string()
      .transform(normalizarCPF)
      .refine(validarCPF, "CPF inválido."),
    telefone: z.string().trim().optional(),
    cidade: z.string().trim().min(2, "Cidade é obrigatória."),
    uf: z
      .string()
      .trim()
      .length(2, "UF deve ter 2 caracteres.")
      .transform((value) => value.toUpperCase())
      .refine((value) => UFS.has(value), "UF inválida."),
    bio: z.string().trim().max(500, "Bio deve ter no máximo 500 caracteres.").optional(),
  })
  .strict();

const resetPasswordSchema = z
  .object({
    newPassword: strongPasswordSchema,
    token: z.string().min(1, "Token é obrigatório.").optional(),
  })
  .strict();

function requestValidationError(code, message, issues) {
  throw APIError.from("BAD_REQUEST", {
    code,
    message,
    issues: issues.map((issue) => ({
      field: issue.path.join("."),
      message: issue.message,
    })),
  });
}

function validateSignUpBody(body) {
  const parsed = signUpSchema.safeParse(body);
  if (parsed.success) return parsed.data;

  const issues = parsed.error.issues;
  const fields = new Set(issues.map((issue) => issue.path[0]));
  if (fields.has("password")) {
    requestValidationError(
      "WEAK_PASSWORD",
      issues.find((issue) => issue.path[0] === "password").message,
      issues,
    );
  }
  if (fields.has("cpf")) {
    requestValidationError(
      "INVALID_CPF",
      issues.find((issue) => issue.path[0] === "cpf").message,
      issues,
    );
  }
  if (fields.has("uf")) {
    requestValidationError(
      "INVALID_UF",
      issues.find((issue) => issue.path[0] === "uf").message,
      issues,
    );
  }

  requestValidationError(
    "INVALID_SIGN_UP_DATA",
    "Dados de cadastro inválidos.",
    issues,
  );
}

function validateResetPasswordBody(body, query) {
  const parsed = resetPasswordSchema.safeParse(body);
  if (!parsed.success) {
    const issues = parsed.error.issues;
    const passwordIssue = issues.find((issue) => issue.path[0] === "newPassword");
    requestValidationError(
      passwordIssue ? "WEAK_PASSWORD" : "INVALID_RESET_PASSWORD_DATA",
      passwordIssue?.message || "Dados para redefinição de senha inválidos.",
      issues,
    );
  }

  const token = parsed.data.token || query?.token;
  if (!token) {
    requestValidationError("INVALID_TOKEN", "Token é obrigatório.", [
      { path: ["token"], message: "Token é obrigatório." },
    ]);
  }

  return { ...parsed.data, token };
}

function createBetterAuthRequestGuard({
  usuarioRepository = new UsuarioRepository(),
} = {}) {
  return createAuthMiddleware(async (ctx) => {
    if (ctx.method !== "POST") return;

    if (ctx.path === "/sign-up/email") {
      const body = validateSignUpBody(ctx.body);
      const usuarioComCpf = await usuarioRepository.buscarPorCpf(body.cpf);
      if (usuarioComCpf) {
        throw APIError.from("CONFLICT", {
          code: "CPF_ALREADY_EXISTS",
          message: "CPF já cadastrado. Faça login ou recupere sua senha.",
        });
      }
      return { context: { body } };
    }

    if (ctx.path === "/reset-password") {
      return {
        context: {
          body: validateResetPasswordBody(ctx.body, ctx.query),
        },
      };
    }
  });
}

export {
  createBetterAuthRequestGuard,
  resetPasswordSchema,
  signUpSchema,
  strongPasswordSchema,
};
