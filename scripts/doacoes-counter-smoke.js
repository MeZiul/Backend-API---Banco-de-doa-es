import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { disconnectPrisma, getDatabaseUrl, getPrisma } from "../src/config/prisma.js";
import ItemDoacaoRepository from "../src/repositories/ItemDoacaoRepository.js";
import UsuarioRepository from "../src/repositories/UsuarioRepository.js";
import ItemDoacaoService from "../src/services/ItemDoacaoService.js";
import transactionManager from "../src/infra/PrismaTransactionManager.js";

function deferred() {
  let resolve;
  const promise = new Promise((done) => { resolve = done; });
  return { promise, resolve };
}

async function run() {
  // Nunca usa DATABASE_URL como fallback nem aplica migrations/backfill.
  assert.equal(process.env.NODE_ENV, "test", "Execute com NODE_ENV=test.");
  const url = new URL(getDatabaseUrl());
  assert.match(decodeURIComponent(url.pathname), /(?:^|[/_-])test(?:$|[_-])/i, "Use um banco explicitamente de testes.");
  const prisma = getPrisma();
  const users = [], items = [], interests = [];
  let category;
  const suffix = randomUUID();
  const userRepository = new UsuarioRepository();
  const service = (repository = new ItemDoacaoRepository(), usuarios = userRepository) =>
    new ItemDoacaoService(repository, {}, {}, { usuarioRepository: usuarios, transactionManager });
  const counter = async (id) => (await prisma.usuario.findUniqueOrThrow({ where: { id } })).total_doacoes;
  try {
    for (const name of ["doador", "beneficiario"]) {
      users.push(await prisma.usuario.create({ data: {
        nome: `QA169 ${name}`, email: `qa169-${name}-${suffix}@doai.local`,
        cpf: `qa169-${name}-${suffix}`, cidade: "Vilhena", uf: "RO",
      } }));
    }
    category = await prisma.categoria.create({ data: { nome: `QA169 ${suffix}`, descricao: "Categoria sintética do smoke" } });
    const [donor, receiver] = users;
    async function fixture(status = "AGUARDANDO_CONFIRMACAO") {
      const item = await prisma.itemDoacao.create({ data: {
        usuario_id: donor.id, categoria_id: category.id, titulo: "QA169 Livro",
        descricao: "Item sintético de concorrência", condicao_item: "USADO_BOM",
        cidade: "Vilhena", uf: "RO", status,
      } });
      items.push(item.id);
      const interest = await prisma.interesse.create({ data: {
        item_id: item.id, usuario_doador_id: donor.id,
        usuario_interessado_id: receiver.id, status: "ACEITO",
      } });
      interests.push(interest.id);
      await prisma.itemDoacao.update({ where: { id: item.id }, data: { interesse_aceito_id: interest.id } });
      return item;
    }
    async function race(winner, duplicate = false) {
      const item = await fixture();
      const before = await counter(donor.id);
      const readGate = deferred(), writeGate = deferred();
      let reads = 0;
      class RacingRepository extends ItemDoacaoRepository {
        async buscarPorId(...args) {
          const snapshot = await super.buscarPorId(...args);
          if (++reads === 2) readGate.resolve();
          await readGate.promise;
          return snapshot;
        }
        async atualizarSeStatus(id, status, data, filters) {
          if (data.status !== winner) await writeGate.promise;
          const result = await super.atualizarSeStatus(id, status, data, filters);
          if (data.status === winner) writeGate.resolve();
          return result;
        }
      }
      const instance = service(new RacingRepository());
      const receive = () => instance.confirmarRecebimento(item.id, receiver.id);
      const cancel = () => instance.cancelarItem(item.id, "Cancelamento sintético", { id: donor.id });
      const results = await Promise.allSettled([receive(), duplicate ? receive() : cancel()]);
      assert.equal(results.filter((result) => result.status === "fulfilled").length, 1);
      assert.equal(results.find((result) => result.status === "rejected").reason.statusCode, 409);
      const persisted = await prisma.itemDoacao.findUniqueOrThrow({ where: { id: item.id } });
      assert.equal(persisted.status, winner);
      assert.equal(Boolean(persisted.data_doacao), winner === "DOADO");
      assert.equal(await counter(donor.id), before + (winner === "DOADO" ? 1 : 0));
      await assert.rejects(service().confirmarRecebimento(item.id, receiver.id), (error) => error.statusCode === 400);
      assert.equal(await counter(donor.id), before + (winner === "DOADO" ? 1 : 0));
    }
    await race("DOADO", true);
    await race("DOADO");
    await race("CANCELADO");
    for (const failAfterIncrement of [false, true]) {
      const item = await fixture();
      const before = await counter(donor.id);
      const instance = service(new ItemDoacaoRepository(), { atualizar: async (...args) => {
        if (failAfterIncrement) await userRepository.atualizar(...args);
        throw new Error("QA169 falha injetada");
      } });
      await assert.rejects(instance.confirmarRecebimento(item.id, receiver.id), /QA169 falha injetada/);
      const persisted = await prisma.itemDoacao.findUniqueOrThrow({ where: { id: item.id } });
      assert.equal(persisted.status, "AGUARDANDO_CONFIRMACAO");
      assert.equal(persisted.data_doacao, null);
      assert.equal(await counter(donor.id), before);
      await service().confirmarRecebimento(item.id, receiver.id);
      assert.equal(await counter(donor.id), before + 1);
    }
    const parallel = await Promise.all([fixture(), fixture()]);
    const before = await counter(donor.id);
    await Promise.all(parallel.map((item) => service().confirmarRecebimento(item.id, receiver.id)));
    assert.equal(await counter(donor.id), before + 2);
    const unauthorized = await fixture();
    await assert.rejects(service().confirmarRecebimento(unauthorized.id, donor.id), (error) => error.statusCode === 403);
    assert.equal(await counter(donor.id), before + 2);
    console.log("PASS QA169: confirmação duplicada, ambos vencedores de cancelamento, retry, rollback antes/depois do incremento, itens paralelos e autorização.");
  } finally {
    // Somente IDs gerados por esta execução; preserva outros fixtures e dados.
    await prisma.$transaction(async (tx) => {
      await tx.itemDoacao.updateMany({ where: { id: { in: items } }, data: { interesse_aceito_id: null } });
      await tx.interesse.deleteMany({ where: { id: { in: interests } } });
      await tx.itemDoacao.deleteMany({ where: { id: { in: items } } });
      if (category) await tx.categoria.delete({ where: { id: category.id } });
      await tx.usuario.deleteMany({ where: { id: { in: users.map((user) => user.id) } } });
    });
    await disconnectPrisma();
  }
}

run().catch((error) => {
  console.error("QA169 FAIL:", error.code ?? error.name);
  process.exitCode = 1;
});
