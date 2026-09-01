import crypto from "node:crypto";
import { fromNodeHeaders } from "better-auth/node";
import { getPrisma, runInTransaction } from "../config/prisma.js";
import AuthHelper from "../utils/AuthHelper.js";
import { CustomError } from "../utils/helpers/index.js";

const CREDENTIAL_ISSUER = "local:credential";
const CREDENTIAL_PROVIDER = "credential";
const DEFAULT_SESSION_EXPIRES_IN_SECONDS = 7 * 24 * 60 * 60;
const GENERIC_RECOVERY_MESSAGE =
  "Se o e-mail estiver cadastrado, voce recebera as instrucoes.";

function asHeaders(headers = {}) {
  return headers instanceof Headers ? headers : fromNodeHeaders(headers);
}

function createOperationalError(statusCode, customMessage) {
  return new CustomError({ statusCode, customMessage });
}

function mapBetterAuthError(error, fallbackMessage) {
  if (error?.name !== "APIError") return error;

  const code = error.body?.code;
  const statusCode = error.statusCode || 400;
  const messages = {
    INVALID_EMAIL_OR_PASSWORD: "E-mail ou senha incorretos.",
    INVALID_TOKEN: "Token inválido ou expirado.",
    PASSWORD_TOO_SHORT: "A senha deve ter no mínimo 8 caracteres.",
    USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL:
      "E-mail já cadastrado. Faça login ou recupere sua senha.",
  };

  return createOperationalError(
    code === "USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL" ? 409 : statusCode,
    messages[code] || fallbackMessage || "Falha na autenticação.",
  );
}

class AutenticacaoService {
  constructor({
    auth,
    usuarioRepository,
    prismaProvider = getPrisma,
    transactionRunner = runInTransaction,
    passwordHelper = AuthHelper,
    tokenFactory = () => crypto.randomBytes(32).toString("base64url"),
    clock = () => new Date(),
    sessionExpiresInSeconds = DEFAULT_SESSION_EXPIRES_IN_SECONDS,
  }) {
    this.auth = auth;
    this.usuarioRepository = usuarioRepository;
    this.prismaProvider = prismaProvider;
    this.transactionRunner = transactionRunner;
    this.passwordHelper = passwordHelper;
    this.tokenFactory = tokenFactory;
    this.clock = clock;
    this.sessionExpiresInSeconds = sessionExpiresInSeconds;
  }

  async cadastrar(dados) {
    try {
      const result = await this.auth.api.signUpEmail({
        body: {
          name: dados.nome,
          email: dados.email,
          password: dados.senha,
          cpf: dados.cpf,
          telefone: dados.telefone,
          cidade: dados.cidade,
          uf: dados.uf,
          bio: dados.bio,
        },
      });

      return result.user;
    } catch (error) {
      throw mapBetterAuthError(error, "Não foi possível cadastrar o usuário.");
    }
  }

  async login(email, senha, requestHeaders = {}) {
    let result;

    try {
      result = await this.auth.api.signInEmail({
        body: { email, password: senha, rememberMe: true },
        headers: asHeaders(requestHeaders),
      });
    } catch (error) {
      throw mapBetterAuthError(error, "E-mail ou senha incorretos.");
    }

    const usuario = await this.usuarioRepository.buscarPorId(result.user.id);
    if (!usuario) {
      await this.prismaProvider().session.deleteMany({ where: { token: result.token } });
      throw createOperationalError(401, "Usuário não encontrado.");
    }

    if (usuario.situacao !== "ATIVO") {
      await this.prismaProvider().session.deleteMany({ where: { token: result.token } });

      if (usuario.situacao === "SUSPENSO") {
        throw createOperationalError(
          403,
          `Conta suspensa até ${usuario.suspensao_ate?.toLocaleDateString?.("pt-BR") || "data não informada"}. Motivo: ${usuario.motivo_suspensao || "não informado"}`,
        );
      }

      throw createOperationalError(403, "Conta inativa.");
    }

    return {
      token: result.token,
      usuario: usuario.toObject?.() ?? usuario,
    };
  }

  async esqueciSenha(email) {
    try {
      await this.auth.api.requestPasswordReset({ body: { email } });
      return { message: GENERIC_RECOVERY_MESSAGE };
    } catch (error) {
      throw mapBetterAuthError(
        error,
        "Não foi possível iniciar a recuperação de senha.",
      );
    }
  }

  async redefinirSenha(token, novaSenha) {
    try {
      await this.auth.api.resetPassword({
        body: { token, newPassword: novaSenha },
      });
      return { message: "Senha redefinida com sucesso." };
    } catch (error) {
      throw mapBetterAuthError(error, "Token inválido ou expirado.");
    }
  }

  async logout(requestHeaders = {}) {
    try {
      await this.auth.api.signOut({ headers: asHeaders(requestHeaders) });
      return { message: "Logout realizado com sucesso." };
    } catch (error) {
      throw mapBetterAuthError(error, "Não foi possível encerrar a sessão.");
    }
  }

  async refreshToken({ sessionToken, usuarioId }) {
    if (!sessionToken || !usuarioId) {
      throw createOperationalError(401, "Sessão autenticada não informada.");
    }

    const now = this.clock();
    const novoToken = this.tokenFactory();
    const expiresAt = new Date(
      now.getTime() + this.sessionExpiresInSeconds * 1000,
    );
    const result = await this.prismaProvider().session.updateMany({
      where: {
        token: sessionToken,
        userId: usuarioId,
        expiresAt: { gt: now },
      },
      data: { token: novoToken, expiresAt },
    });

    if (result.count !== 1) {
      throw createOperationalError(401, "Sessão inválida ou expirada.");
    }

    return novoToken;
  }

  async verificarSenhaUsuario(usuarioId, senha) {
    const account = await this.prismaProvider().account.findFirst({
      where: {
        userId: usuarioId,
        providerId: CREDENTIAL_PROVIDER,
        issuer: CREDENTIAL_ISSUER,
      },
      select: { password: true },
    });

    if (!account?.password) return false;
    return this.passwordHelper.comparePassword(senha, account.password);
  }

  async atualizarSenhaUsuario(usuarioId, novaSenha, { revogarSessoes = true } = {}) {
    const password = await this.passwordHelper.hashPassword(novaSenha);

    return this.transactionRunner(async (prisma) => {
      const result = await prisma.account.updateMany({
        where: {
          userId: usuarioId,
          providerId: CREDENTIAL_PROVIDER,
          issuer: CREDENTIAL_ISSUER,
        },
        data: { password },
      });

      if (result.count !== 1) {
        throw createOperationalError(404, "Credencial do usuário não encontrada.");
      }

      if (revogarSessoes) {
        await prisma.session.deleteMany({ where: { userId: usuarioId } });
      }

      return true;
    });
  }

  async revogarSessoesUsuario(usuarioId) {
    await this.prismaProvider().session.deleteMany({ where: { userId: usuarioId } });
  }
}

export { asHeaders, mapBetterAuthError };
export default AutenticacaoService;
