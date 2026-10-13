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

// Make dotenv/config skip the workspace .env; this smoke receives its test settings explicitly.
process.env.DOTENV_CONFIG_PATH = path.join(process.cwd(), ".codex-disabled-dotenv-test-file");
process.env.BETTER_AUTH_URL = "http://localhost:7340";
process.env.FRONTEND_URL = "http://localhost:3000";
process.env.BETTER_AUTH_SECRET = "doai-test-secret-not-for-production-2026";

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

const app = express();
configureTrustProxy(app, 1);
registerBetterAuthRoutes(app);
app.use(express.json());
app.use(usuarioRoutes);
app.use(authRoutes);
app.use(errorHandler);

const prisma = getPrisma();
const email = `auth-http-${randomUUID().slice(0, 8)}@doai.local`;
const trustedOrigin = "http://localhost:3000";
let userId;

async function contarSessoes() {
  return prisma.session.count({ where: { userId } });
}

async function run() {
  const cadastro = await request(app).post("/usuario").send({
    nome: "Usuário HTTP Smoke",
    email,
    cpf: gerarCpfValido(),
    senha: "SmokeAuth@123",
    cidade: "Vilhena",
    uf: "RO",
  });
  assert.equal(cadastro.statusCode, 201, JSON.stringify(cadastro.body));
  userId = cadastro.body.data._id;

  const nativeLogin = await request(app)
    .post("/api/auth/sign-in/email")
    .set("Origin", trustedOrigin)
    .send({ email, password: "SmokeAuth@123" });
  assert.equal(nativeLogin.statusCode, 200, JSON.stringify(nativeLogin.body));
  assert.ok(nativeLogin.body.token);
  assert.equal(nativeLogin.body.user.id, userId);
  assert.equal(nativeLogin.body.user.email, email);
  assert.equal(await contarSessoes(), 1);

  const nativeLogout = await request(app)
    .post("/auth/logout")
    .set("Authorization", `Bearer ${nativeLogin.body.token}`);
  assert.equal(nativeLogout.statusCode, 200, JSON.stringify(nativeLogout.body));
  assert.equal(await contarSessoes(), 0);

  const wrongPassword = await request(app)
    .post("/api/auth/sign-in/email")
    .set("Origin", trustedOrigin)
    .set("X-Forwarded-For", "198.51.100.10")
    .send({ email, password: "SenhaIncorreta@123" });
  assert.equal(wrongPassword.statusCode, 401, JSON.stringify(wrongPassword.body));
  assert.equal(await contarSessoes(), 0);

  const absentUser = await request(app)
    .post("/api/auth/sign-in/email")
    .set("Origin", trustedOrigin)
    .set("X-Forwarded-For", "198.51.100.11")
    .send({ email: `missing-${randomUUID()}@doai.local`, password: "SmokeAuth@123" });
  assert.equal(absentUser.statusCode, 401, JSON.stringify(absentUser.body));
  assert.equal(await contarSessoes(), 0);

  const badOrigin = await request(app)
    .post("/api/auth/sign-in/email")
    .set("Origin", "https://untrusted.example")
    .set("X-Forwarded-For", "198.51.100.12")
    .send({ email, password: "SmokeAuth@123" });
  assert.equal(badOrigin.statusCode, 403, JSON.stringify(badOrigin.body));
  assert.equal(await contarSessoes(), 0);

  const signupStillBlocked = await request(app)
    .post("/api/auth/sign-up/email")
    .set("Origin", trustedOrigin)
    .send({ email: `blocked-${randomUUID()}@doai.local`, password: "SmokeAuth@123", name: "Blocked" });
  assert.equal(signupStillBlocked.statusCode, 404, JSON.stringify(signupStillBlocked.body));

  for (const [path, method] of [
    ["/api/auth/request-password-reset", "post"],
    ["/api/auth/reset-password", "post"],
    ["/api/auth/change-password", "post"],
    ["/api/auth/change-email", "post"],
    ["/api/auth/update-user", "post"],
    ["/api/auth/delete-user", "post"],
  ]) {
    const disabledPath = await request(app)[method](path)
      .set("Origin", trustedOrigin)
      .send({});
    assert.equal(disabledPath.statusCode, 404, `${path}: ${JSON.stringify(disabledPath.body)}`);
  }

  const malformedNativeLogin = await request(app)
    .post("/api/auth/sign-in/email")
    .set("Origin", trustedOrigin)
    .set("X-Forwarded-For", "198.51.100.13");
  assert.equal(malformedNativeLogin.statusCode, 400, JSON.stringify(malformedNativeLogin.body));

  const legacyWrongPassword = await request(app)
    .post("/auth/login")
    .set("X-Forwarded-For", "198.51.100.20")
    .send({ email, senha: "SenhaIncorreta@123" });
  assert.equal(legacyWrongPassword.statusCode, 401, JSON.stringify(legacyWrongPassword.body));

  const legacyLogin = await request(app)
    .post("/auth/login")
    .set("X-Forwarded-For", "198.51.100.21")
    .send({ email, senha: "SmokeAuth@123" });
  assert.equal(legacyLogin.statusCode, 200, JSON.stringify(legacyLogin.body));
  const firstToken = legacyLogin.body.data.token;
  assert.ok(firstToken);

  const authenticated = await request(app)
    .get(`/usuario/${userId}`)
    .set("Authorization", `Bearer ${firstToken}`);
  assert.equal(authenticated.statusCode, 200, JSON.stringify(authenticated.body));

  const refresh = await request(app)
    .post("/auth/refresh-token")
    .set("Authorization", `Bearer ${firstToken}`);
  assert.equal(refresh.statusCode, 200, JSON.stringify(refresh.body));
  const secondToken = refresh.body.data.token;
  assert.ok(secondToken);
  assert.notEqual(secondToken, firstToken);

  const oldTokenRejected = await request(app)
    .get(`/usuario/${userId}`)
    .set("Authorization", `Bearer ${firstToken}`);
  assert.equal(oldTokenRejected.statusCode, 498);

  const newTokenAccepted = await request(app)
    .get(`/usuario/${userId}`)
    .set("Authorization", `Bearer ${secondToken}`);
  assert.equal(newTokenAccepted.statusCode, 200);

  const logout = await request(app)
    .post("/auth/logout")
    .set("Authorization", `Bearer ${secondToken}`);
  assert.equal(logout.statusCode, 200, JSON.stringify(logout.body));
  assert.equal(await contarSessoes(), 0);

  await prisma.usuario.update({
    where: { id: userId },
    data: {
      situacao: "SUSPENSO",
      motivo_suspensao: "Validação do smoke de autenticação",
      suspensao_ate: new Date(Date.now() + 24 * 60 * 60 * 1000),
    },
  });

  const suspendedNativeLogin = await request(app)
    .post("/api/auth/sign-in/email")
    .set("Origin", trustedOrigin)
    .set("X-Forwarded-For", "198.51.100.30")
    .send({ email, password: "SmokeAuth@123" });
  assert.equal(suspendedNativeLogin.statusCode, 403, JSON.stringify(suspendedNativeLogin.body));
  assert.equal(suspendedNativeLogin.body.code, "ACCOUNT_SUSPENDED");
  assert.equal(await contarSessoes(), 0);

  const suspendedLegacyLogin = await request(app)
    .post("/auth/login")
    .set("X-Forwarded-For", "198.51.100.31")
    .send({ email, senha: "SmokeAuth@123" });
  assert.equal(suspendedLegacyLogin.statusCode, 403, JSON.stringify(suspendedLegacyLogin.body));
  assert.equal(await contarSessoes(), 0);

  await prisma.usuario.update({
    where: { id: userId },
    data: { situacao: "INATIVO" },
  });

  const inactiveNativeLogin = await request(app)
    .post("/api/auth/sign-in/email")
    .set("Origin", trustedOrigin)
    .set("X-Forwarded-For", "198.51.100.32")
    .send({ email, password: "SmokeAuth@123" });
  assert.equal(inactiveNativeLogin.statusCode, 403, JSON.stringify(inactiveNativeLogin.body));
  assert.equal(inactiveNativeLogin.body.code, "ACCOUNT_INACTIVE");
  assert.equal(await contarSessoes(), 0);

  const limiterIp = "198.51.100.99";
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const response = await request(app)
      .post("/api/auth/sign-in/email")
      .set("Origin", trustedOrigin)
      .set("X-Forwarded-For", limiterIp)
      .send({ email, password: "WrongPassword@123" });
    assert.notEqual(response.statusCode, 429, JSON.stringify(response.body));
  }
  const rateLimited = await request(app)
    .post("/api/auth/sign-in/email")
    .set("Origin", trustedOrigin)
    .set("X-Forwarded-For", limiterIp)
    .send({ email, password: "WrongPassword@123" });
  assert.equal(rateLimited.statusCode, 429, JSON.stringify(rateLimited.body));

  console.log(
    "OK: native email sign-in, status guard/no-session, origin, limiter, legacy login, refresh and logout validados no PostgreSQL de teste.",
  );
}

run()
  .catch((error) => {
    console.error("Falha no smoke HTTP Better Auth:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    if (userId) await prisma.usuario.deleteMany({ where: { id: userId } });
    await disconnectPrisma();
  });
