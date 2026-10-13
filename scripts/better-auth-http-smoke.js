import assert from "node:assert/strict";
import { randomInt, randomUUID } from "node:crypto";
import path from "node:path";

function assertLocalTestDatabase() {
  assert.equal(process.env.NODE_ENV, "test", "Use NODE_ENV=test.");
  assert.ok(process.env.TEST_DATABASE_URL, "TEST_DATABASE_URL is required.");

  const databaseUrl = new URL(process.env.TEST_DATABASE_URL);
  assert.equal(databaseUrl.protocol, "postgresql:");
  assert.ok(["localhost", "127.0.0.1", "::1"].includes(databaseUrl.hostname));
  assert.equal(databaseUrl.port, "5433", "Only the isolated TEST PostgreSQL port is allowed.");
  assert.equal(databaseUrl.pathname, "/doai_test", "Only the doai_test database is allowed.");
}

assertLocalTestDatabase();

// Keep this smoke isolated from the workspace .env and never send recovery mail.
process.env.DOTENV_CONFIG_PATH = path.join(process.cwd(), ".codex-disabled-dotenv-test-file");
process.env.BETTER_AUTH_URL = "http://localhost:7340";
process.env.FRONTEND_URL = "http://localhost:3000";
process.env.BETTER_AUTH_SECRET = "doai-test-secret-not-for-production-2026";
process.env.DISABLED_EMAIL = "true";

const [
  { default: express },
  { default: request },
  { registerBetterAuthRoutes },
  { default: authRoutes },
  { default: usuarioRoutes },
  { disconnectPrisma, getPrisma },
  { default: errorHandler },
  { configureTrustProxy },
] = await Promise.all([
  import("express"),
  import("supertest"),
  import("../src/routes/betterAuthRoutes.js"),
  import("../src/routes/authRoutes.js"),
  import("../src/routes/usuarioRoutes.js"),
  import("../src/config/prisma.js"),
  import("../src/utils/helpers/errorHandler.js"),
  import("../src/config/trustProxy.js"),
]);

function gerarCpfValido() {
  const base = Array.from({ length: 9 }, () => randomInt(0, 10));
  if (base.every((digit) => digit === base[0])) base[8] = (base[8] + 1) % 10;

  const calcular = (digits, pesoInicial) => {
    const soma = digits.reduce(
      (total, digit, index) => total + digit * (pesoInicial - index),
      0,
    );
    const resto = (soma * 10) % 11;
    return resto === 10 ? 0 : resto;
  };

  const primeiro = calcular(base, 10);
  const segundo = calcular([...base, primeiro], 11);
  const digits = [...base, primeiro, segundo].join("");
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
}

function assertStatus(response, expected, label) {
  assert.equal(response.statusCode, expected, `${label} returned HTTP ${response.statusCode}.`);
}

const app = express();
configureTrustProxy(app, 1);
registerBetterAuthRoutes(app);
app.use(express.json());
app.use(usuarioRoutes);
app.use(authRoutes);
app.use(errorHandler);

const prisma = getPrisma();
const suffix = randomUUID().slice(0, 8);
const email = `auth-http-${suffix}@doai.local`;
const cpf = gerarCpfValido();
const trustedOrigin = "http://localhost:3000";
const password = "SmokeAuth@123";
const nextPassword = "NativeReset@456";
let userId;

async function contarSessoes() {
  return prisma.session.count({ where: { userId } });
}

function nativeSignup(body, ip) {
  return request(app)
    .post("/api/auth/sign-up/email")
    .set("Origin", trustedOrigin)
    .set("X-Forwarded-For", ip)
    .send(body);
}

function nativeLogin(emailAddress, passwordValue, ip) {
  return request(app)
    .post("/api/auth/sign-in/email")
    .set("Origin", trustedOrigin)
    .set("X-Forwarded-For", ip)
    .send({ email: emailAddress, password: passwordValue });
}

async function run() {
  const invalidCpf = await nativeSignup({
    name: "CPF Inválido",
    email: `invalid-cpf-${suffix}@doai.local`,
    password,
    cpf: "111.111.111-11",
    cidade: "Vilhena",
    uf: "ro",
  }, "198.51.100.101");
  assertStatus(invalidCpf, 400, "invalid CPF signup");
  assert.equal(invalidCpf.body.code, "INVALID_CPF");

  const weakPassword = await nativeSignup({
    name: "Senha Fraca",
    email: `weak-password-${suffix}@doai.local`,
    password: "weak",
    cpf: gerarCpfValido(),
    cidade: "Vilhena",
    uf: "RO",
  }, "198.51.100.102");
  assertStatus(weakPassword, 400, "weak password signup");
  assert.equal(weakPassword.body.code, "WEAK_PASSWORD");

  const invalidUf = await nativeSignup({
    name: "UF Inválida",
    email: `invalid-uf-${suffix}@doai.local`,
    password,
    cpf: gerarCpfValido(),
    cidade: "Vilhena",
    uf: "ZZ",
  }, "198.51.100.103");
  assertStatus(invalidUf, 400, "invalid UF signup");
  assert.equal(invalidUf.body.code, "INVALID_UF");

  const privilegedSignup = await nativeSignup({
    name: "Campo Privilegiado",
    email: `privileged-${suffix}@doai.local`,
    password,
    cpf: gerarCpfValido(),
    cidade: "Vilhena",
    uf: "RO",
    perfil: "ADMINISTRADOR",
  }, "198.51.100.104");
  assertStatus(privilegedSignup, 400, "mass assignment signup");
  assert.equal(privilegedSignup.body.code, "INVALID_SIGN_UP_DATA");

  const cadastro = await nativeSignup({
    name: "Usuário Nativo Smoke",
    email: ` ${email.toUpperCase()} `,
    password,
    cpf,
    telefone: "(69) 99999-9999",
    cidade: " Vilhena ",
    uf: "ro",
    bio: "Cadastro pelo endpoint nativo",
  }, "198.51.100.105");
  userId = cadastro.body?.user?.id;
  assertStatus(cadastro, 200, "native signup");
  assert.equal(cadastro.body.token, null, "Signup must not create an authenticated session.");
  assert.ok(userId);
  assert.equal(await contarSessoes(), 0);

  const usuario = await prisma.usuario.findUnique({ where: { id: userId } });
  assert.ok(usuario);
  assert.equal(usuario.email, email);
  assert.equal(usuario.cpf, cpf.replace(/\D/g, ""));
  assert.equal(usuario.uf, "RO");
  assert.equal(usuario.perfil, "USUARIO");
  assert.equal(usuario.situacao, "ATIVO");
  assert.equal(usuario.total_avaliacoes, 0);
  assert.equal(usuario.total_doacoes, 0);

  const account = await prisma.account.findFirst({
    where: { userId, providerId: "credential", issuer: "local:credential" },
    select: { password: true },
  });
  assert.ok(account?.password);

  const duplicateCpf = await nativeSignup({
    name: "CPF Duplicado",
    email: `duplicate-cpf-${suffix}@doai.local`,
    password,
    cpf: cpf.replace(/\D/g, ""),
    cidade: "Cuiabá",
    uf: "MT",
  }, "198.51.100.106");
  assertStatus(duplicateCpf, 409, "duplicate CPF signup");
  assert.equal(duplicateCpf.body.code, "CPF_ALREADY_EXISTS");

  const nativeSignIn = await nativeLogin(email, password, "198.51.100.110");
  assertStatus(nativeSignIn, 200, "native sign-in");
  const firstToken = nativeSignIn.body.token;
  assert.ok(firstToken);
  assert.equal(nativeSignIn.body.user.id, userId);
  assert.equal(await contarSessoes(), 1);

  const nativeSession = await request(app)
    .get("/api/auth/get-session")
    .set("Authorization", `Bearer ${firstToken}`);
  assertStatus(nativeSession, 200, "native get-session");
  assert.equal(nativeSession.body.user.id, userId);

  const nativeLogout = await request(app)
    .post("/api/auth/sign-out")
    .set("Authorization", `Bearer ${firstToken}`);
  assertStatus(nativeLogout, 200, "native sign-out");
  assert.equal(await contarSessoes(), 0);

  const invalidOrigin = await request(app)
    .post("/api/auth/sign-up/email")
    .set("Origin", "https://untrusted.example")
    .set("X-Forwarded-For", "198.51.100.107")
    .send({
      name: "Origem Inválida",
      email: `invalid-origin-${suffix}@doai.local`,
      password,
      cpf: gerarCpfValido(),
      cidade: "Vilhena",
      uf: "RO",
    });
  assertStatus(invalidOrigin, 403, "untrusted signup origin");

  const wrongPassword = await nativeLogin(email, "SenhaIncorreta@123", "198.51.100.111");
  assertStatus(wrongPassword, 401, "wrong native password");

  const absentUser = await nativeLogin(`missing-${suffix}@doai.local`, password, "198.51.100.112");
  assertStatus(absentUser, 401, "missing native user");

  const recovery = await request(app)
    .post("/api/auth/request-password-reset")
    .set("Origin", trustedOrigin)
    .set("X-Forwarded-For", "198.51.100.120")
    .send({ email, redirectTo: "http://localhost:3000/redefinir-senha" });
  assertStatus(recovery, 200, "native password recovery");

  const absentRecovery = await request(app)
    .post("/api/auth/request-password-reset")
    .set("Origin", trustedOrigin)
    .set("X-Forwarded-For", "198.51.100.121")
    .send({ email: `missing-${suffix}@doai.local` });
  assertStatus(absentRecovery, 200, "recovery for absent user");
  assert.deepEqual(absentRecovery.body, recovery.body, "Recovery response must not reveal whether the email exists.");

  const resetVerification = await prisma.verification.findFirst({
    where: {
      value: userId,
      identifier: { startsWith: "reset-password:" },
    },
  });
  assert.ok(resetVerification, "Expected the reset token fixture created by the isolated request.");
  const resetToken = resetVerification.identifier.slice("reset-password:".length);

  const beforeResetLogin = await nativeLogin(email, password, "198.51.100.122");
  assertStatus(beforeResetLogin, 200, "sign-in before password reset");
  assert.equal(await contarSessoes(), 1);

  const weakReset = await request(app)
    .post("/api/auth/reset-password")
    .set("Origin", trustedOrigin)
    .set("X-Forwarded-For", "198.51.100.123")
    .send({ token: resetToken, newPassword: "weak" });
  assertStatus(weakReset, 400, "weak password reset");
  assert.equal(weakReset.body.code, "WEAK_PASSWORD");
  assert.equal(await contarSessoes(), 1);

  const reset = await request(app)
    .post("/api/auth/reset-password")
    .set("Origin", trustedOrigin)
    .set("X-Forwarded-For", "198.51.100.124")
    .send({ token: resetToken, newPassword: nextPassword });
  assertStatus(reset, 200, "native password reset");
  assert.equal(await contarSessoes(), 0, "Password reset must revoke all user sessions.");

  const oldPassword = await nativeLogin(email, password, "198.51.100.125");
  assertStatus(oldPassword, 401, "old password after reset");
  assert.equal(await contarSessoes(), 0);

  const newPasswordLogin = await nativeLogin(email, nextPassword, "198.51.100.126");
  assertStatus(newPasswordLogin, 200, "new password after reset");
  assert.equal(await contarSessoes(), 1);

  const newPasswordLogout = await request(app)
    .post("/api/auth/sign-out")
    .set("Authorization", `Bearer ${newPasswordLogin.body.token}`);
  assertStatus(newPasswordLogout, 200, "sign-out after password reset");
  assert.equal(await contarSessoes(), 0);

  const suspensaoAte = new Date("2026-10-20T12:00:00-04:00");
  const motivoSuspensao = "Validação do smoke de autenticação";
  await prisma.usuario.update({
    where: { id: userId },
    data: {
      situacao: "SUSPENSO",
      motivo_suspensao: motivoSuspensao,
      suspensao_ate: suspensaoAte,
    },
  });

  const suspendedNativeLogin = await nativeLogin(email, nextPassword, "198.51.100.130");
  assertStatus(suspendedNativeLogin, 403, "suspended native sign-in");
  assert.equal(suspendedNativeLogin.body.code, "ACCOUNT_SUSPENDED");
  assert.equal(
    suspendedNativeLogin.body.message,
    `Conta suspensa até ${suspensaoAte.toLocaleDateString("pt-BR")}. Motivo: ${motivoSuspensao}`,
  );
  assert.equal(await contarSessoes(), 0);

  const legacyWrongPassword = await request(app)
    .post("/auth/login")
    .set("X-Forwarded-For", "198.51.100.140")
    .send({ email, senha: "SenhaIncorreta@123" });
  assertStatus(legacyWrongPassword, 401, "legacy wrong password");

  const legacyLogin = await request(app)
    .post("/auth/login")
    .set("X-Forwarded-For", "198.51.100.141")
    .send({ email, senha: nextPassword });
  assertStatus(legacyLogin, 403, "legacy suspended login");
  assert.equal(await contarSessoes(), 0);

  await prisma.usuario.update({
    where: { id: userId },
    data: { situacao: "INATIVO" },
  });

  const inactiveNativeLogin = await nativeLogin(email, nextPassword, "198.51.100.142");
  assertStatus(inactiveNativeLogin, 403, "inactive native sign-in");
  assert.equal(inactiveNativeLogin.body.code, "ACCOUNT_INACTIVE");
  assert.equal(await contarSessoes(), 0);

  const limiterIp = "198.51.100.199";
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const response = await nativeLogin(email, "WrongPassword@123", limiterIp);
    assert.notEqual(response.statusCode, 429, "Login limiter triggered before its configured limit.");
  }
  const rateLimited = await nativeLogin(email, "WrongPassword@123", limiterIp);
  assertStatus(rateLimited, 429, "shared native login limiter");

  for (const [route, method] of [
    ["/api/auth/change-password", "post"],
    ["/api/auth/change-email", "post"],
    ["/api/auth/update-user", "post"],
    ["/api/auth/delete-user", "post"],
  ]) {
    const disabledPath = await request(app)[method](route)
      .set("Origin", trustedOrigin)
      .send({});
    assertStatus(disabledPath, 404, `${route} remains disabled`);
  }

  const malformedNativeLogin = await request(app)
    .post("/api/auth/sign-in/email")
    .set("Origin", trustedOrigin)
    .set("X-Forwarded-For", "198.51.100.200");
  assertStatus(malformedNativeLogin, 400, "malformed native login");

  console.log(
    "OK: native signup validation/CPF normalization, Better Auth sessions, password reset/revocation, suspension guard, legacy login compatibility, origins and limiters passed against local TEST PostgreSQL.",
  );
}

run()
  .catch((error) => {
    console.error("Falha no smoke HTTP Better Auth:", error?.name || "Error", error?.message || "Unknown error");
    process.exitCode = 1;
  })
  .finally(async () => {
    if (userId) {
      await prisma.verification.deleteMany({
        where: {
          value: userId,
          identifier: { startsWith: "reset-password:" },
        },
      });
      await prisma.usuario.deleteMany({ where: { id: userId, email } });
    }
    await disconnectPrisma();
  });
