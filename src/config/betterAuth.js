import "dotenv/config";
import bcrypt from "bcryptjs";
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { bearer } from "better-auth/plugins";
import MailService from "../infra/MailService.js";
import { getPrisma } from "./prisma.js";

const SESSION_EXPIRES_IN_SECONDS = 7 * 24 * 60 * 60;
const SESSION_UPDATE_AGE_SECONDS = 24 * 60 * 60;

function getBaseUrl() {
  return (
    process.env.BETTER_AUTH_URL ||
    process.env.BASE_URL ||
    `http://localhost:${process.env.APP_PORT || 7340}`
  ).replace(/\/$/, "");
}

function getSecret() {
  const secret = process.env.BETTER_AUTH_SECRET;

  if (!secret) {
    throw new Error(
      "BETTER_AUTH_SECRET não foi definida. Configure um segredo aleatório com pelo menos 32 caracteres.",
    );
  }

  return secret;
}

function getTrustedOrigins() {
  const configured = (process.env.BETTER_AUTH_TRUSTED_ORIGINS || "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

  return [...new Set([getBaseUrl(), process.env.FRONTEND_URL, ...configured].filter(Boolean))];
}

const mailService = new MailService();

export const auth = betterAuth({
  appName: "DoaI",
  baseURL: getBaseUrl(),
  basePath: "/api/auth",
  secret: getSecret(),
  trustedOrigins: getTrustedOrigins(),
  disabledPaths: [
    "/sign-up/email",
    "/sign-in/email",
    "/request-password-reset",
    "/reset-password",
    "/change-password",
    "/change-email",
    "/update-user",
    "/delete-user",
  ],
  database: prismaAdapter(getPrisma(), {
    provider: "postgresql",
    transaction: true,
  }),
  user: {
    modelName: "usuario",
    fields: {
      name: "nome",
      emailVerified: "email_verificado",
      image: "foto_perfil",
      createdAt: "data_cadastro",
      updatedAt: "data_atualizacao",
    },
    additionalFields: {
      cpf: { type: "string", required: true },
      telefone: { type: "string", required: false },
      cidade: { type: "string", required: true },
      uf: { type: "string", required: true },
      bio: { type: "string", required: false },
    },
  },
  emailAndPassword: {
    enabled: true,
    autoSignIn: false,
    minPasswordLength: 8,
    maxPasswordLength: 128,
    resetPasswordTokenExpiresIn: 60 * 60,
    revokeSessionsOnPasswordReset: true,
    password: {
      hash: (password) => bcrypt.hash(password, 12),
      verify: ({ hash, password }) => bcrypt.compare(password, hash),
    },
    sendResetPassword: async ({ user, token }) => {
      await mailService.enviarLinkRecuperacao({ email: user.email, token });
    },
  },
  session: {
    expiresIn: SESSION_EXPIRES_IN_SECONDS,
    updateAge: SESSION_UPDATE_AGE_SECONDS,
  },
  advanced: {
    useSecureCookies: process.env.NODE_ENV === "production",
    database: { generateId: "uuid" },
  },
  plugins: [bearer()],
});

export { SESSION_EXPIRES_IN_SECONDS };
