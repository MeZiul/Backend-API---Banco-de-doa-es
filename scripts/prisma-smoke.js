import "dotenv/config";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  disconnectPrisma,
  getDatabaseUrl,
  getPrisma,
  runInTransaction,
} from "../src/config/prisma.js";
import AdministracaoRepository from "../src/repositories/AdministracaoRepository.js";
import AvaliacaoRepository from "../src/repositories/AvaliacaoRepository.js";
import CategoriaRepository from "../src/repositories/CategoriaRepository.js";
import DenunciaRepository from "../src/repositories/DenunciaRepository.js";
import InteresseRepository from "../src/repositories/InteresseRepository.js";
import ItemDoacaoRepository from "../src/repositories/ItemDoacaoRepository.js";
import notificacaoRepository from "../src/repositories/NotificacaoRepository.js";
import UsuarioRepository from "../src/repositories/UsuarioRepository.js";

const ROLLBACK_MESSAGE = "ROLLBACK_SMOKE_TEST";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function deployMigrations() {
  const prismaCli = path.join(root, "node_modules", "prisma", "build", "index.js");
  const result = spawnSync(process.execPath, [prismaCli, "migrate", "deploy"], {
    cwd: root,
    env: {
      ...process.env,
      DATABASE_URL: getDatabaseUrl(),
    },
    stdio: "inherit",
  });

  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`prisma migrate deploy terminou com código ${result.status}.`);
  }
}

async function run() {
  deployMigrations();

  const prisma = getPrisma();
  await prisma.$queryRawUnsafe("SELECT 1");

  const suffix = randomUUID().slice(0, 8);
  const emailDoador = `smoke-doador-${suffix}@doai.local`;
  const usuarioRepository = new UsuarioRepository();
  const categoriaRepository = new CategoriaRepository();
  const itemRepository = new ItemDoacaoRepository();
  const interesseRepository = new InteresseRepository();
  const avaliacaoRepository = new AvaliacaoRepository();
  const denunciaRepository = new DenunciaRepository();
  const administracaoRepository = new AdministracaoRepository();

  try {
    await runInTransaction(async (tx) => {
      const doador = await tx.usuario.create({
        data: {
          nome: "Smoke Doador",
          email: emailDoador,
          cpf: `smoke-doador-${suffix}`,
          cidade: "Porto Velho",
          uf: "RO",
        },
      });
      const interessado = await tx.usuario.create({
        data: {
          nome: "Smoke Interessado",
          email: `smoke-interessado-${suffix}@doai.local`,
          cpf: `smoke-interessado-${suffix}`,
          cidade: "Porto Velho",
          uf: "RO",
        },
      });
      const administrador = await tx.usuario.create({
        data: {
          nome: "Smoke Administrador",
          email: `smoke-admin-${suffix}@doai.local`,
          cpf: `smoke-admin-${suffix}`,
          cidade: "Porto Velho",
          uf: "RO",
          perfil: "ADMINISTRADOR",
        },
      });

      await tx.account.createMany({
        data: [doador, interessado, administrador].map((usuario) => ({
          id: `credential:${usuario.id}`,
          issuer: "local:credential",
          accountId: usuario.id,
          providerId: "credential",
          userId: usuario.id,
          password: "hash-smoke",
        })),
      });

      const categoria = await categoriaRepository.criar({
        nome: `Smoke ${suffix}`,
        ordem: 999,
      });
      const item = await itemRepository.criar({
        usuario_id: doador.id,
        categoria_id: categoria._id,
        titulo: "Item smoke",
        descricao: "Registro temporário para validar os repositórios Prisma.",
        condicao_item: "USADO_BOM",
        cidade: "Porto Velho",
        uf: "RO",
        status: "DISPONIVEL",
        fotos: [{ url: "/uploads/smoke.jpg", ordem: 0 }],
      });
      const interesse = await interesseRepository.criar({
        item_id: item._id,
        usuario_interessado_id: interessado.id,
        usuario_doador_id: doador.id,
        status: "PENDENTE",
      });

      assert.ok(await itemRepository.incrementarInteressesSeDisponivel(item._id));
      assert.ok(await itemRepository.reservarSeDisponivel(item._id, interesse._id));
      const interesseAceito = await interesseRepository.atualizarSeStatus(
        interesse._id,
        "PENDENTE",
        { status: "ACEITO", data_resposta: new Date() },
      );
      const avaliacao = await avaliacaoRepository.criar({
        item_id: item._id,
        avaliador_id: interessado.id,
        avaliado_id: doador.id,
        nota: 5,
        tipo: "INTERESSADO_PARA_DOADOR",
      });
      const denuncia = await denunciaRepository.criar({
        denunciante_id: interessado.id,
        tipo_alvo: "ITEM",
        alvo_item_id: item._id,
        motivo: "OUTRO",
        descricao: "Denúncia temporária do smoke test.",
      });
      const denunciaRemovivel = await denunciaRepository.criar({
        denunciante_id: interessado.id,
        tipo_alvo: "USUARIO",
        alvo_usuario_id: doador.id,
        motivo: "OUTRO",
        descricao: "Denúncia removível do smoke test.",
      });
      const administracao = await administracaoRepository.criar({
        administrador_id: administrador.id,
        tipo_acao: "BLOQUEIO_USUARIO",
        tipo_alvo: "USUARIO",
        alvo_id: doador.id,
        justificativa: "Auditoria temporária do smoke test.",
      });
      const [notificacao] = await notificacaoRepository.criarMuitas([
        {
          usuario_id: doador.id,
          tipo: "SISTEMA",
          titulo: "Smoke test",
          mensagem: "Notificação temporária.",
        },
      ]);
      const notificacaoLida = await notificacaoRepository.marcarComoLida(
        notificacao._id,
        doador.id,
      );
      const contaCredencial = await tx.account.findFirst({
        where: {
          userId: doador.id,
          issuer: "local:credential",
          providerId: "credential",
        },
      });
      const administradoresAtivos = await usuarioRepository.listarAdministradoresAtivos();
      const itemCarregado = await itemRepository.buscarPorId(item._id);
      const denunciaResolvida = await denunciaRepository.atualizarSeStatus(
        denuncia._id,
        "EM_ANALISE",
        { status: "PROCEDENTE", data_analise: new Date() },
      );
      const exclusaoResolvida = await denunciaRepository.deletarSeEmAnalise(
        denuncia._id,
        interessado.id,
      );
      const denunciaRemovida = await denunciaRepository.deletarSeEmAnalise(
        denunciaRemovivel._id,
        interessado.id,
      );

      assert.equal(contaCredencial?.password, "hash-smoke");
      assert.ok(administradoresAtivos.some((usuario) => usuario._id === administrador.id));
      assert.equal(itemCarregado?.fotos.length, 1);
      assert.equal(interesseAceito?.status, "ACEITO");
      assert.equal(avaliacao?.nota, 5);
      assert.equal(denunciaResolvida?.status, "PROCEDENTE");
      assert.equal(exclusaoResolvida, null);
      assert.equal(denunciaRemovida?._id, denunciaRemovivel._id);
      assert.equal(
        await tx.denuncia.findUnique({ where: { id: denunciaRemovivel._id } }),
        null,
      );
      assert.equal(administracao?.alvo_id, doador.id);
      assert.equal(notificacaoLida?.lida, true);

      throw new Error(ROLLBACK_MESSAGE);
    });
  } catch (error) {
    if (error?.message !== ROLLBACK_MESSAGE) throw error;
  }

  const residual = await prisma.usuario.findUnique({
    where: { email: emailDoador },
  });
  assert.equal(residual, null);

  console.log(
    "OK: migrations, conexão, repositórios, relações e rollback Prisma/PostgreSQL validados.",
  );
}

run()
  .catch((error) => {
    console.error("Falha no smoke test Prisma:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await disconnectPrisma();
  });
