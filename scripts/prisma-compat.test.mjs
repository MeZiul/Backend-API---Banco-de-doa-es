import test from "node:test";
import assert from "node:assert/strict";
import {
  asLegacyDocument,
  buildInclude,
  legacyPaginateShape,
  toPrismaOrderBy,
  toPrismaWhere,
} from "../src/repositories/prisma/prismaUtils.js";

test("converte filtros Mongo legados para Prisma sem reintroduzir regex escapada", () => {
  const where = toPrismaWhere({
    _id: "abc",
    nome: { $regex: "Maria \\[admin\\]\\.\\*", $options: "i" },
    status: { $in: ["PENDENTE", "ACEITO"] },
    $or: [{ cidade: /^Porto Velho$/i }, { uf: "RO" }],
  });

  assert.deepEqual(where, {
    id: "abc",
    nome: { contains: "Maria [admin].*", mode: "insensitive" },
    status: { in: ["PENDENTE", "ACEITO"] },
    OR: [
      { cidade: { contains: "Porto Velho", mode: "insensitive" } },
      { uf: "RO" },
    ],
  });
});

test("converte ordenação Mongoose para orderBy do Prisma", () => {
  assert.deepEqual(toPrismaOrderBy({ data_cadastro: -1, nome: 1 }), [
    { data_cadastro: "desc" },
    { nome: "asc" },
  ]);
});

test("preserva formato legado _id e oculta segredos em relações populadas", () => {
  const mapped = asLegacyDocument(
    {
      id: "item-1",
      usuario_id: "user-1",
      usuario: {
        id: "user-1",
        nome: "Maria",
        email: "maria@example.com",
        senha: "nao-pode-vazar",
      },
    },
    { relationMap: { usuario_id: "usuario" } },
  );

  assert.equal(mapped._id, "item-1");
  assert.equal(mapped.usuario_id._id, "user-1");
  assert.equal(mapped.usuario_id.nome, "Maria");
  assert.equal("senha" in mapped.usuario_id, false);
  assert.equal(typeof mapped.toObject, "function");
});

test("buildInclude respeita seleção de populate", () => {
  assert.deepEqual(
    buildInclude(
      [{ path: "usuario_id", select: "nome cidade media_avaliacoes" }],
      { usuario_id: "usuario" },
    ),
    {
      usuario: {
        select: {
          id: true,
          nome: true,
          cidade: true,
          media_avaliacoes: true,
        },
      },
    },
  );
});

test("paginação mantém shape legado do mongoose-paginate-v2", () => {
  assert.deepEqual(
    legacyPaginateShape({ docs: [{ _id: "1" }], totalDocs: 31, page: 2, limit: 15 }),
    {
      docs: [{ _id: "1" }],
      totalDocs: 31,
      limit: 15,
      totalPages: 3,
      page: 2,
      pagingCounter: 16,
      hasPrevPage: true,
      hasNextPage: true,
      prevPage: 1,
      nextPage: 3,
    },
  );
});
