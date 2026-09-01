import "dotenv/config";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { fromNodeHeaders } from "better-auth/node";
import { auth } from "../src/config/betterAuth.js";
import { disconnectPrisma, getPrisma } from "../src/config/prisma.js";

const prisma = getPrisma();
const suffix = randomUUID().slice(0, 8);
const email = `better-auth-smoke-${suffix}@doai.local`;
const baseUrl = (
  process.env.BETTER_AUTH_URL ||
  process.env.BASE_URL ||
  `http://localhost:${process.env.APP_PORT || 7340}`
).replace(/\/$/, "");
let userId;

async function run() {
  const cadastro = await auth.api.signUpEmail({
    body: {
      name: "Better Auth Smoke",
      email,
      password: "SmokeAuth@123",
      cpf: `smoke-auth-${suffix}`,
      cidade: "Vilhena",
      uf: "RO",
    },
  });
  userId = cadastro.user.id;

  const account = await prisma.account.findFirst({
    where: {
      userId,
      issuer: "local:credential",
      providerId: "credential",
    },
  });
  assert.ok(account?.password);

  const nativeLogin = await auth.handler(
    new Request(`${baseUrl}/api/auth/sign-in/email`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email, password: "SmokeAuth@123" }),
    }),
  );
  assert.equal(nativeLogin.status, 404);

  const login = await auth.api.signInEmail({
    body: { email, password: "SmokeAuth@123" },
  });
  assert.equal(login.user.id, userId);
  assert.ok(login.token);

  const headers = fromNodeHeaders({ authorization: `Bearer ${login.token}` });
  const session = await auth.api.getSession({
    headers,
    query: { disableCookieCache: true },
  });
  assert.equal(session?.user?.id, userId);

  await auth.api.signOut({ headers });
  const invalidatedSession = await auth.api.getSession({
    headers,
    query: { disableCookieCache: true },
  });
  assert.equal(invalidatedSession, null);

  console.log(
    "OK: cadastro, login, bearer, consulta e revogação de sessão Better Auth validados.",
  );
}

run()
  .catch((error) => {
    console.error("Falha no smoke test Better Auth:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    if (userId) {
      await prisma.usuario.deleteMany({ where: { id: userId } });
    }
    await disconnectPrisma();
  });
