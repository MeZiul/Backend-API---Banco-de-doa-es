const HIDDEN_FIELDS = new Set([
  "senha",
  "token_redefinicao",
  "token_redefinicao_expira",
]);

export function isPrismaNotFound(error) {
  return error?.code === "P2025";
}

export function isPrismaUnique(error) {
  return error?.code === "P2002";
}

export function mapPrismaErrorToLegacy(error) {
  if (!isPrismaUnique(error)) return error;

  const target = Array.isArray(error?.meta?.target)
    ? error.meta.target
    : error?.meta?.target
      ? [error.meta.target]
      : [];

  const legacyError = new Error(error?.message || "Restrição única violada.");
  legacyError.name = error?.name || "UniqueConstraintError";
  legacyError.code = 11000;
  legacyError.keyValue = Object.fromEntries(
    target.map((field) => [field, "duplicado"]),
  );
  legacyError.cause = error;
  return legacyError;
}

function regexSourceToLiteral(source) {
  return String(source)
    .replace(/^\^|\$$/g, "")
    .replace(/\\([.*+?^${}()|[\]\\])/g, "$1");
}

export function toPrismaWhere(value) {
  if (!value || typeof value !== "object" || value instanceof Date || value instanceof RegExp) {
    return value;
  }

  if (Array.isArray(value)) return value.map(toPrismaWhere);

  const output = {};

  for (const [rawKey, rawValue] of Object.entries(value)) {
    if (rawKey === "$or") {
      output.OR = rawValue.map((part) => toPrismaWhere(part));
      continue;
    }
    if (rawKey === "$and") {
      output.AND = rawValue.map((part) => toPrismaWhere(part));
      continue;
    }

    const key = rawKey === "_id" ? "id" : rawKey;

    if (rawValue instanceof RegExp) {
      output[key] = {
        contains: regexSourceToLiteral(rawValue.source),
        mode: rawValue.flags.includes("i") ? "insensitive" : undefined,
      };
      if (!output[key].mode) delete output[key].mode;
      continue;
    }

    if (rawValue && typeof rawValue === "object" && !Array.isArray(rawValue) && !(rawValue instanceof Date)) {
      if ("$regex" in rawValue) {
        const regex = rawValue.$regex;
        output[key] = {
          contains: regexSourceToLiteral(
            regex instanceof RegExp ? regex.source : regex,
          ),
          mode:
            rawValue.$options?.includes("i") || regex?.flags?.includes?.("i")
              ? "insensitive"
              : undefined,
        };
        if (!output[key].mode) delete output[key].mode;
        continue;
      }

      const operators = {};
      if ("$in" in rawValue) operators.in = rawValue.$in;
      if ("$nin" in rawValue) operators.notIn = rawValue.$nin;
      if ("$ne" in rawValue) operators.not = rawValue.$ne;
      if ("$gte" in rawValue) operators.gte = rawValue.$gte;
      if ("$gt" in rawValue) operators.gt = rawValue.$gt;
      if ("$lte" in rawValue) operators.lte = rawValue.$lte;
      if ("$lt" in rawValue) operators.lt = rawValue.$lt;

      if (Object.keys(operators).length > 0) {
        output[key] = operators;
      } else {
        output[key] = toPrismaWhere(rawValue);
      }
      continue;
    }

    output[key] = rawValue;
  }

  return output;
}

export function toPrismaOrderBy(sort = {}) {
  return Object.entries(sort).map(([rawKey, direction]) => ({
    [rawKey === "_id" ? "id" : rawKey]:
      direction === -1 || direction === "desc" ? "desc" : "asc",
  }));
}

function selectStringToPrisma(select) {
  if (!select) return undefined;

  const tokens = String(select)
    .split(/\s+/)
    .map((token) => token.trim())
    .filter(Boolean);

  const positive = tokens.filter(
    (token) => !token.startsWith("-") && !token.startsWith("+"),
  );

  if (positive.length === 0) return undefined;

  // Prisma não possui o _id implícito do Mongoose. Incluímos id para que a
  // camada de compatibilidade possa devolvê-lo como _id nas relações populadas.
  return Object.fromEntries(["id", ...positive].map((field) => [field, true]));
}

export function buildInclude(populate = [], relationMap = {}) {
  if (!populate) return undefined;
  const list = Array.isArray(populate) ? populate : [populate];
  const include = {};

  for (const entry of list) {
    const legacyPath = typeof entry === "string" ? entry : entry.path;
    const relation = relationMap[legacyPath];
    if (!relation) continue;

    const select =
      typeof entry === "object" ? selectStringToPrisma(entry.select) : undefined;

    include[relation] = select ? { select } : true;
  }

  return Object.keys(include).length > 0 ? include : undefined;
}

function clonePlain(value, includeHidden = false) {
  if (value === null || value === undefined) return value;
  if (value instanceof Date) return new Date(value);
  if (Array.isArray(value)) return value.map((item) => clonePlain(item, includeHidden));
  if (typeof value !== "object") return value;

  const out = {};
  for (const [key, child] of Object.entries(value)) {
    if (!includeHidden && HIDDEN_FIELDS.has(key)) continue;
    out[key] = clonePlain(child, includeHidden);
  }
  return out;
}

export function asLegacyDocument(
  record,
  { relationMap = {}, includeHidden = false, extraMap = null } = {},
) {
  if (!record) return null;

  const out = clonePlain(record, includeHidden);

  for (const [legacyField, relationField] of Object.entries(relationMap)) {
    if (Object.prototype.hasOwnProperty.call(out, relationField)) {
      out[legacyField] = asLegacyValue(out[relationField], { includeHidden });
      delete out[relationField];
    }
  }

  if (Object.prototype.hasOwnProperty.call(out, "id")) {
    out._id = out.id;
    delete out.id;
  }

  if (Array.isArray(out.fotos)) {
    out.fotos = out.fotos.map((foto) => asLegacyDocument(foto, { includeHidden }));
  }

  if (typeof extraMap === "function") {
    extraMap(out, record);
  }

  Object.defineProperty(out, "toObject", {
    enumerable: false,
    configurable: false,
    value: () => clonePlain(out, includeHidden),
  });

  return out;
}

export function asLegacyValue(value, options = {}) {
  if (Array.isArray(value)) {
    return value.map((entry) =>
      entry && typeof entry === "object"
        ? asLegacyDocument(entry, options)
        : entry,
    );
  }
  if (value && typeof value === "object") {
    return asLegacyDocument(value, options);
  }
  return value;
}

export function projectLegacy(document, select) {
  if (!document || !select) return document;

  const tokens = String(select)
    .split(/\s+/)
    .map((token) => token.trim())
    .filter(Boolean);

  const positive = tokens.filter((token) => !token.startsWith("-") && !token.startsWith("+"));
  if (positive.length === 0) return document;

  const keep = new Set(["_id", ...positive]);
  const out = {};

  for (const [key, value] of Object.entries(document)) {
    if (keep.has(key)) out[key] = value;
  }

  Object.defineProperty(out, "toObject", {
    enumerable: false,
    value: () => clonePlain(out, false),
  });

  return out;
}

export function legacyPaginateShape({ docs, totalDocs, page, limit }) {
  const totalPages = Math.max(1, Math.ceil(totalDocs / limit));
  return {
    docs,
    totalDocs,
    limit,
    totalPages,
    page,
    pagingCounter: (page - 1) * limit + 1,
    hasPrevPage: page > 1,
    hasNextPage: page < totalPages,
    prevPage: page > 1 ? page - 1 : null,
    nextPage: page < totalPages ? page + 1 : null,
  };
}

export function stripLegacyFields(data = {}) {
  const clean = { ...data };
  delete clean._id;
  delete clean.id;
  delete clean.createdAt;
  delete clean.updatedAt;
  delete clean.data_cadastro;
  delete clean.data_atualizacao;
  return clean;
}
