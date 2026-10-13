import { APIError } from "better-auth/api";
import { getPrisma } from "./prisma.js";

const INACTIVE_ACCOUNT_ERRORS = {
  SUSPENSO: {
    code: "ACCOUNT_SUSPENDED",
    message: "Account suspended.",
  },
  INATIVO: {
    code: "ACCOUNT_INACTIVE",
    message: "Account inactive.",
  },
};

function createSessionStatusGuard(prismaProvider = getPrisma) {
  return async function ensureActiveAccount(session) {
    const usuario = session?.userId
      ? await prismaProvider().usuario.findUnique({
          where: { id: session.userId },
          select: { situacao: true },
        })
      : null;

    if (usuario?.situacao === "ATIVO") return;

    const accountError =
      INACTIVE_ACCOUNT_ERRORS[usuario?.situacao] || {
        code: "ACCOUNT_UNAVAILABLE",
        message: "Account unavailable.",
      };

    throw APIError.from("FORBIDDEN", accountError);
  };
}

export { createSessionStatusGuard };
