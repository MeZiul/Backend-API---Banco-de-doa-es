import "dotenv/config";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { getPrisma, disconnectPrisma } from "../src/config/prisma.js";

const ROLLBACK_MESSAGE = "ROLLBACK_SMOKE_TEST";

async function run() {
  const prisma = getPrisma();
  await prisma.$queryRawUnsafe("SELECT 1");

  try {
    await prisma.$transaction(async (tx) => {
      const suffix = randomUUID().slice(0, 8);
      const doador = await tx.usuario.create({
        data: {
          nome: "Smoke Doador",
          email: `smoke-doador-${suffix}@doai.local`,
          cpf: `smoke-doador-${suffix}`,
          cidade: "Porto Velho",
          uf: "RO",
          senha: "hash-smoke",
        },
      });
      const interessado = await tx.usuario.create({
        data: {
          nome: "Smoke Interessado",
          email: `smoke-interessado-${suffix}@doai.local`,
          cpf: `smoke-interessado-${suffix}`,
          cidade: "Porto Velho",
          uf: "RO",
          senha: "hash-smoke",
        },
      });
      const categoria = await tx.categoria.create({
        data: { nome: `Smoke ${suffix}`, ordem: 999 },
      });
      const item = await tx.itemDoacao.create({
        data: {
          usuario_id: doador.id,
          categoria_id: categoria.id,
          titulo: "Item smoke",
          descricao: "Registro temporário para validar o Prisma.",
          condicao_item: "USADO_BOM",
          cidade: "Porto Velho",
          uf: "RO",
          status: "DISPONIVEL",
          fotos: {
            create: [{ url: "/uploads/smoke.jpg", ordem: 0 }],
          },
        },
        include: { fotos: true },
      });
      const interesse = await tx.interesse.create({
        data: {
          item_id: item.id,
          usuario_interessado_id: interessado.id,
          usuario_doador_id: doador.id,
          status: "ACEITO",
        },
      });
      await tx.itemDoacao.update({
        where: { id: item.id },
        data: {
          status: "RESERVADO",
          interesse_aceito_id: interesse.id,
          total_interesses: 1,
        },
      });

      const loaded = await tx.itemDoacao.findUnique({
        where: { id: item.id },
        include: {
          usuario: true,
          categoria: true,
          fotos: true,
          interesse_aceito: true,
        },
      });

      assert.equal(loaded?.usuario.id, doador.id);
      assert.equal(loaded?.categoria.id, categoria.id);
      assert.equal(loaded?.fotos.length, 1);
      assert.equal(loaded?.interesse_aceito?.id, interesse.id);
      assert.equal(loaded?.status, "RESERVADO");

      throw new Error(ROLLBACK_MESSAGE);
    });
  } catch (error) {
    if (error?.message !== ROLLBACK_MESSAGE) throw error;
  }

  console.log("OK: conexão, CRUD, relações e transação Prisma/PostgreSQL validados.");
}

run()
  .catch((error) => {
    console.error("Falha no smoke test Prisma:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await disconnectPrisma();
  });
