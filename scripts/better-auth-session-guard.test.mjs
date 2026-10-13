import assert from "node:assert/strict";
import test from "node:test";
import { createSessionStatusGuard } from "../src/config/sessionStatusGuard.js";

function createGuardFor(situacao) {
  const calls = [];
  const findUnique = async (query) => {
    calls.push(query);
    return situacao ? { situacao } : null;
  };
  return {
    calls,
    guard: createSessionStatusGuard(() => ({
      usuario: { findUnique },
    })),
  };
}

test("session guard permits only an active account", async () => {
  const { calls, guard } = createGuardFor("ATIVO");
  await assert.doesNotReject(() => guard({ userId: "usuario-1" }));
  assert.deepEqual(calls, [
    { where: { id: "usuario-1" }, select: { situacao: true } },
  ]);
});

for (const [situacao, code] of [
  ["SUSPENSO", "ACCOUNT_SUSPENDED"],
  ["INATIVO", "ACCOUNT_INACTIVE"],
  [null, "ACCOUNT_UNAVAILABLE"],
]) {
  test(`session guard rejects ${situacao ?? "missing account"} with 403`, async () => {
    const { guard } = createGuardFor(situacao);
    await assert.rejects(guard({ userId: "usuario-3" }), (error) => {
      assert.equal(error.name, "APIError");
      assert.equal(error.statusCode, 403);
      assert.equal(error.body.code, code);
      return true;
    });
  });
}

test("session guard rejects a malformed session before querying Prisma", async () => {
  let queried = false;
  const guard = createSessionStatusGuard(() => ({
    usuario: { findUnique: async () => { queried = true; return null; } },
  }));

  await assert.rejects(guard({}), (error) => error.statusCode === 403);
  assert.equal(queried, false);
});
