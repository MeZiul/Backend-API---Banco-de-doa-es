import { getPrisma } from "../config/prisma.js";
import { mapPrismaErrorToLegacy, toPrismaWhere } from "../repositories/prisma/prismaUtils.js";

function asSeedDoc(record) {
  if (!record) return null;
  if (Array.isArray(record)) return record.map(asSeedDoc);
  if (typeof record !== "object" || record instanceof Date) return record;

  const doc = {};
  for (const [key, value] of Object.entries(record)) {
    doc[key] = asSeedDoc(value);
  }
  if (Object.prototype.hasOwnProperty.call(doc, "id")) {
    doc._id = doc.id;
    delete doc.id;
  }
  return doc;
}

function normalizeSeedData(data = {}) {
  const clean = { ...data };
  if (Object.prototype.hasOwnProperty.call(clean, "_id")) {
    clean.id = String(clean._id);
    delete clean._id;
  }
  return clean;
}

/**
 * Adaptador mínimo usado exclusivamente pelo seed legado.
 * Mantém o formato `_id` esperado pelos builders do seed, mas todas as
 * operações são executadas pelo Prisma Client sobre PostgreSQL.
 */
export function createLegacySeedModel(delegateName) {
  const delegate = () => getPrisma()[delegateName];

  return {
    async deleteMany(where = {}) {
      return delegate().deleteMany({ where: toPrismaWhere(where) });
    },

    async insertMany(docs) {
      const created = [];
      for (const doc of docs) {
        try {
          created.push(
            await delegate().create({
              data: normalizeSeedData(doc),
            }),
          );
        } catch (error) {
          throw mapPrismaErrorToLegacy(error);
        }
      }
      return asSeedDoc(created);
    },

    async find(where = {}) {
      return asSeedDoc(
        await delegate().findMany({ where: toPrismaWhere(where) }),
      );
    },

    async findOneAndUpdate(where, update, options = {}) {
      const prismaWhere = toPrismaWhere(where);
      const data = normalizeSeedData(update?.$set ?? update ?? {});

      const existing = await delegate().findFirst({ where: prismaWhere });
      if (existing) {
        try {
          return asSeedDoc(
            await delegate().update({
              where: { id: existing.id },
              data,
            }),
          );
        } catch (error) {
          throw mapPrismaErrorToLegacy(error);
        }
      }

      if (!options.upsert) return null;

      const equalityFields = Object.fromEntries(
        Object.entries(prismaWhere).filter(
          ([, value]) => value === null || ["string", "number", "boolean"].includes(typeof value),
        ),
      );
      try {
        return asSeedDoc(
          await delegate().create({
            data: { ...equalityFields, ...data },
          }),
        );
      } catch (error) {
        throw mapPrismaErrorToLegacy(error);
      }
    },

    async findByIdAndUpdate(id, update) {
      const data = normalizeSeedData(update?.$set ?? update ?? {});
      try {
        return asSeedDoc(
          await delegate().update({
            where: { id: String(id) },
            data,
          }),
        );
      } catch (error) {
        throw mapPrismaErrorToLegacy(error);
      }
    },
  };
}

export default createLegacySeedModel;
