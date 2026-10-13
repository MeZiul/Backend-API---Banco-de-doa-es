import { APIError } from "better-auth/api";
import { getPrisma } from "./prisma.js";

const INACTIVE_ACCOUNT_ERRORS = {
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
          select: {
            situacao: true,
            suspensao_ate: true,
            motivo_suspensao: true,
          },
        })
      : null;

    if (usuario?.situacao === "ATIVO") return;

    if (usuario?.situacao === "SUSPENSO") {
      throw APIError.from("FORBIDDEN", {
        code: "ACCOUNT_SUSPENDED",
        message: `Conta suspensa até ${usuario.suspensao_ate?.toLocaleDateString?.("pt-BR") || "data não informada"}. Motivo: ${usuario.motivo_suspensao || "não informado"}`,
      });
    }

    const accountError =
      INACTIVE_ACCOUNT_ERRORS[usuario?.situacao] || {
        code: "ACCOUNT_UNAVAILABLE",
        message: "Account unavailable.",
      };

    throw APIError.from("FORBIDDEN", accountError);
  };
}

export { createSessionStatusGuard };
