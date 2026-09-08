import "dotenv/config";
import assert from "node:assert/strict";
import { randomInt, randomUUID } from "node:crypto";
import express from "express";
import request from "supertest";
import { toNodeHandler } from "better-auth/node";
import { auth } from "../src/config/betterAuth.js";
import authRoutes from "../src/routes/authRoutes.js";
import usuarioRoutes from "../src/routes/usuarioRoutes.js";
import { disconnectPrisma, getPrisma } from "../src/config/prisma.js";
import errorHandler from "../src/utils/helpers/errorHandler.js";

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
app.all("/api/auth/*splat", toNodeHandler(auth));
app.use(express.json());
app.use(usuarioRoutes);
app.use(authRoutes);
app.use(errorHandler);

const prisma = getPrisma();
const email = `auth-http-${randomUUID().slice(0, 8)}@doai.local`;
let userId;

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

  const nativeLoginBlocked = await request(app)
    .post("/api/auth/sign-in/email")
    .send({ email, password: "SmokeAuth@123" });
  assert.equal(nativeLoginBlocked.statusCode, 404, JSON.stringify(nativeLoginBlocked.body));

  const wrongPassword = await request(app).post("/auth/login").send({
    email,
    senha: "SenhaIncorreta@123",
  });
  assert.equal(wrongPassword.statusCode, 401, JSON.stringify(wrongPassword.body));

  const login = await request(app).post("/auth/login").send({
    email,
    senha: "SmokeAuth@123",
  });
  assert.equal(login.statusCode, 200, JSON.stringify(login.body));
  const firstToken = login.body.data.token;
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

  const loggedOutTokenRejected = await request(app)
    .get(`/usuario/${userId}`)
    .set("Authorization", `Bearer ${secondToken}`);
  assert.equal(loggedOutTokenRejected.statusCode, 498);

  assert.equal(await prisma.session.count({ where: { userId } }), 0);

  await prisma.usuario.update({
    where: { id: userId },
    data: {
      situacao: "SUSPENSO",
      motivo_suspensao: "Validação do smoke de autenticação",
      suspensao_ate: new Date(Date.now() + 24 * 60 * 60 * 1000),
    },
  });

  const suspendedLogin = await request(app).post("/auth/login").send({
    email,
    senha: "SmokeAuth@123",
  });
  assert.equal(suspendedLogin.statusCode, 403, JSON.stringify(suspendedLogin.body));
  assert.equal(await prisma.session.count({ where: { userId } }), 0);

  console.log(
    "OK: cadastro, bloqueios, login, rota protegida, refresh e logout HTTP validados.",
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
