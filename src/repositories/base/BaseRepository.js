import { getPrisma, runInTransaction } from "../../config/prisma.js";
import {
  asLegacyDocument,
  buildInclude,
  mapPrismaErrorToLegacy,
  legacyPaginateShape,
  projectLegacy,
  stripLegacyFields,
  toPrismaOrderBy,
  toPrismaWhere,
} from "../prisma/prismaUtils.js";

class BaseRepository {
  constructor(
    delegateName,
    {
      relationMap = {},
      defaultInclude = undefined,
      includeHidden = false,
    } = {},
  ) {
    this.delegateName = delegateName;
    this.relationMap = relationMap;
    this.defaultInclude = defaultInclude;
    this.includeHidden = includeHidden;
  }

  get client() {
    return getPrisma();
  }

  get model() {
    return this.client[this.delegateName];
  }

  get delegate() {
    return this.client[this.delegateName];
  }

  withTransaction(operation, options = {}) {
    return runInTransaction(operation, { client: this.client, ...options });
  }

  normalizeData(data) {
    return stripLegacyFields(data);
  }

  transformWhere(where) {
    return where;
  }

  mapRecord(record, { includeHidden = this.includeHidden } = {}) {
    return asLegacyDocument(record, {
      relationMap: this.relationMap,
      includeHidden,
    });
  }

  mergeInclude(extraInclude) {
    if (!this.defaultInclude && !extraInclude) return undefined;
    return {
      ...(this.defaultInclude || {}),
      ...(extraInclude || {}),
    };
  }

  async buscarPorId(id, options = {}) {
    const include = this.mergeInclude(
      buildInclude(options.populate, this.relationMap),
    );

    const record = await this.delegate.findUnique({
      where: { id: String(id) },
      ...(include ? { include } : {}),
    });

    const mapped = this.mapRecord(record, {
      includeHidden: Boolean(options.includeHidden),
    });

    return projectLegacy(mapped, options.select);
  }

  async criar(dados) {
    try {
      const record = await this.delegate.create({
        data: this.normalizeData(dados, { mode: "create" }),
        ...(this.defaultInclude ? { include: this.defaultInclude } : {}),
      });
      return this.mapRecord(record);
    } catch (error) {
      throw mapPrismaErrorToLegacy(error);
    }
  }

  async atualizar(id, dados) {
    try {
      const record = await this.delegate.update({
        where: { id: String(id) },
        data: this.normalizeData(dados, { mode: "update" }),
        ...(this.defaultInclude ? { include: this.defaultInclude } : {}),
      });
      return this.mapRecord(record);
    } catch (error) {
      if (error?.code === "P2025") return null;
      throw mapPrismaErrorToLegacy(error);
    }
  }

  async deletar(id) {
    const existing = await this.delegate.findUnique({
      where: { id: String(id) },
      ...(this.defaultInclude ? { include: this.defaultInclude } : {}),
    });

    if (!existing) return null;

    try {
      await this.delegate.delete({ where: { id: String(id) } });
      return this.mapRecord(existing);
    } catch (error) {
      if (error?.code === "P2025") return null;
      throw mapPrismaErrorToLegacy(error);
    }
  }

  async listarComPaginacao(filtro = {}, options = {}) {
    const page = Math.max(1, Number(options.page) || 1);
    const limit = Math.max(1, Number(options.limit) || 15);
    const where = this.transformWhere(toPrismaWhere(filtro));
    const populateInclude = buildInclude(options.populate, this.relationMap);
    const requestedInclude = {
      ...(populateInclude || {}),
      ...(options.include || {}),
    };
    const include = this.mergeInclude(
      Object.keys(requestedInclude).length > 0 ? requestedInclude : undefined,
    );
    const orderBy = toPrismaOrderBy(options.sort || {});

    const [records, totalDocs] = await Promise.all([
      this.delegate.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        ...(orderBy.length ? { orderBy } : {}),
        ...(include ? { include } : {}),
      }),
      this.delegate.count({ where }),
    ]);

    const docs = records.map((record) =>
      projectLegacy(this.mapRecord(record), options.select),
    );

    return legacyPaginateShape({ docs, totalDocs, page, limit });
  }
}

export default BaseRepository;
