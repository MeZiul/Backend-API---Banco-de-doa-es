import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { getPrisma, disconnectPrisma } from "../src/config/prisma.js";
import prismaTransactionManager from "../src/infra/PrismaTransactionManager.js";
import AvaliacaoService from "../src/services/AvaliacaoService.js";
import AvaliacaoRepository from "../src/repositories/AvaliacaoRepository.js";
import ItemDoacaoRepository from "../src/repositories/ItemDoacaoRepository.js";
import InteresseRepository from "../src/repositories/InteresseRepository.js";
import UsuarioRepository from "../src/repositories/UsuarioRepository.js";

// No dotenv or DATABASE_URL fallback: this script only touches its own fixtures.
assert.equal(process.env.NODE_ENV, "test");
const testUrl = new URL(process.env.TEST_DATABASE_URL);
assert.match(testUrl.pathname, /^\/doai_test(?:_[a-z0-9]+)?$/);
assert.ok(["127.0.0.1", "localhost", "postgres-test"].includes(testUrl.hostname));

const prisma = getPrisma();
const suffix = randomUUID();
const users = [];
const items = [];
let categoria;
const repository = new AvaliacaoRepository();
const usuarioRepository = new UsuarioRepository();
const service = new AvaliacaoService({
  avaliacaoRepository: repository,
  usuarioRepository,
  itemDoacaoRepository: new ItemDoacaoRepository(),
  interesseRepository: new InteresseRepository(),
  transactionManager: prismaTransactionManager,
});

async function novaDoacao() {
  const item = await prisma.itemDoacao.create({ data: {
    usuario_id: users[0].id, categoria_id: categoria.id,
    titulo: "Avaliação QA", descricao: "Fixture isolada de concorrência",
    condicao_item: "USADO_BOM", cidade: "Porto Velho", uf: "RO",
    status: "DOADO", data_doacao: new Date(),
  } });
  items.push(item.id);
  const interesse = await prisma.interesse.create({ data: {
    item_id: item.id, usuario_doador_id: users[0].id,
    usuario_interessado_id: users[1].id, status: "ACEITO",
  } });
  await prisma.itemDoacao.update({ where: { id: item.id }, data: { interesse_aceito_id: interesse.id } });
  return item;
}

const dados = (item, nota = 5) => ({ item_id: item.id, avaliado_id: users[0].id,
  nota, tipo: "INTERESSADO_PARA_DOADOR" });
const actor = () => ({ id: users[1].id, perfil: "USUARIO" });

async function reputacaoConsistente() {
  const agregado = await prisma.avaliacao.aggregate({ where: { avaliado_id: users[0].id },
    _count: { _all: true }, _avg: { nota: true } });
  const usuario = await prisma.usuario.findUnique({ where: { id: users[0].id } });
  assert.equal(usuario.total_avaliacoes, agregado._count._all);
  assert.equal(usuario.media_avaliacoes, Number((agregado._avg.nota ?? 0).toFixed(1)));
  return usuario;
}

async function run() {
  for (const name of ["Doador", "Beneficiado"]) {
    users.push(await prisma.usuario.create({ data: { nome: name,
      email: `avaliacao-${name}-${suffix}@doai.local`, cpf: `qa-${name}-${suffix}`,
      cidade: "Porto Velho", uf: "RO" } }));
  }
  categoria = await prisma.categoria.create({ data: { nome: `Avaliação QA ${suffix}` } });

  // More than the former page cap, with distinct item IDs for the unique key.
  const seeds = Array.from({ length: 1001 }, () => ({ id: randomUUID(),
    usuario_id: users[0].id, categoria_id: categoria.id, titulo: "QA histórico",
    descricao: "Fixture", condicao_item: "USADO_BOM", cidade: "Porto Velho", uf: "RO",
    status: "DOADO", data_doacao: new Date() }));
  items.push(...seeds.map((item) => item.id));
  await prisma.itemDoacao.createMany({ data: seeds });
  await prisma.avaliacao.createMany({ data: seeds.map((item) => ({ item_id: item.id,
    avaliador_id: users[1].id, avaliado_id: users[0].id, nota: 1,
    tipo: "INTERESSADO_PARA_DOADOR" })) });

  const primeira = await novaDoacao();
  const segunda = await novaDoacao();
  const ratings = await Promise.all([
    service.criar(dados(primeira, 5), users[1].id),
    service.criar(dados(segunda, 3), users[1].id),
  ]);
  assert.equal((await reputacaoConsistente()).total_avaliacoes, 1003);
  console.log("PASS: concurrent creates, complete COUNT/AVG above 1000");

  await Promise.all([
    service.atualizar(ratings[0]._id, { nota: 2 }, actor()),
    service.deletar(ratings[1]._id, actor()),
  ]);
  assert.equal((await reputacaoConsistente()).total_avaliacoes, 1002);
  console.log("PASS: concurrent edit/delete preserve complete reputation");

  const duplicateItem = await novaDoacao();
  const duplicate = await Promise.allSettled([
    service.criar(dados(duplicateItem), users[1].id),
    service.criar(dados(duplicateItem), users[1].id),
  ]);
  assert.equal(duplicate.filter((result) => result.status === "fulfilled").length, 1);
  assert.equal(duplicate.find((result) => result.status === "rejected").reason.statusCode, 409);
  await reputacaoConsistente();
  console.log("PASS: duplicate race has one winner and domain 409");

  const reciprocalItem = await novaDoacao();
  await Promise.all([
    service.criar(dados(reciprocalItem), users[1].id),
    service.criar({ item_id: reciprocalItem.id, avaliado_id: users[1].id,
      nota: 4, tipo: "DOADOR_PARA_INTERESSADO" }, users[0].id),
  ]);
  await reputacaoConsistente();
  assert.equal((await prisma.usuario.findUnique({ where: { id: users[1].id } })).total_avaliacoes, 1);
  console.log("PASS: reciprocal concurrent ratings do not deadlock on foreign keys");

  const rollbackItem = await novaDoacao();
  const previous = await reputacaoConsistente();
  const atualizarOriginal = usuarioRepository.atualizar;
  usuarioRepository.atualizar = async () => { throw new Error("QA_REPUTATION_FAILURE"); };
  try {
    await assert.rejects(service.criar(dados(rollbackItem), users[1].id), /QA_REPUTATION_FAILURE/);
    assert.equal(await prisma.avaliacao.count({ where: { item_id: rollbackItem.id } }), 0);
    await assert.rejects(service.atualizar(ratings[0]._id, { nota: 5 }, actor()), /QA_REPUTATION_FAILURE/);
    assert.equal((await prisma.avaliacao.findUnique({ where: { id: ratings[0]._id } })).nota, 2);
    await assert.rejects(service.deletar(ratings[0]._id, actor()), /QA_REPUTATION_FAILURE/);
    assert.ok(await prisma.avaliacao.findUnique({ where: { id: ratings[0]._id } }));
    const after = await prisma.usuario.findUnique({ where: { id: users[0].id } });
    assert.equal(after.total_avaliacoes, previous.total_avaliacoes);
    assert.equal(after.media_avaliacoes, previous.media_avaliacoes);
  } finally { usuarioRepository.atualizar = atualizarOriginal; }
  console.log("PASS: real PostgreSQL rollback of create, edit and delete on reputation failure");
}

try {
  await run();
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
} finally {
  // Fixture IDs belong exclusively to this run; never truncate shared tables.
  await prisma.itemDoacao.deleteMany({ where: { id: { in: items } } });
  if (categoria) await prisma.categoria.delete({ where: { id: categoria.id } });
  await prisma.usuario.deleteMany({ where: { id: { in: users.map((user) => user.id) } } });
  await disconnectPrisma();
}
