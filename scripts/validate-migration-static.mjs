import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const schema = fs.readFileSync(path.join(root, "prisma/schema.prisma"), "utf8");
const migrationsDir = path.join(root, "prisma/migrations");
const migration = fs
  .readdirSync(migrationsDir, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) =>
    fs.readFileSync(path.join(migrationsDir, entry.name, "migration.sql"), "utf8"),
  )
  .join("\n");
const pkg = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));

const expectedModels = [
  "Usuario",
  "Categoria",
  "ItemDoacao",
  "FotoItemDoacao",
  "Interesse",
  "Avaliacao",
  "Denuncia",
  "Administracao",
  "Notificacao",
  "Session",
  "Account",
  "Verification",
];

const expectedConstraints = [
  "interesse_ativo_unico_por_usuario_item",
  "interesse_aceito_unico_por_item",
  "denuncia_item_em_analise_unica_por_denunciante",
  "denuncia_usuario_em_analise_unica_por_denunciante",
  "Denuncia_alvo_check",
  "Administracao_alvo_check",
  "Account_issuer_accountId_key",
  "Session_token_key",
];

const errors = [];
for (const model of expectedModels) {
  if (!schema.includes(`model ${model} {`)) errors.push(`Model ausente: ${model}`);
}
for (const constraint of expectedConstraints) {
  if (!migration.includes(constraint)) errors.push(`Constraint/índice ausente: ${constraint}`);
}

for (const dependency of [
  "mongoose",
  "mongoose-paginate-v2",
  "mongoose-aggregate-paginate-v2",
  "mongodb",
  "mongodb-memory-server",
]) {
  if (pkg.dependencies?.[dependency] || pkg.devDependencies?.[dependency]) {
    errors.push(`Dependência Mongo residual: ${dependency}`);
  }
}

const forbiddenSourcePatterns = [
  /from\s+["']mongoose["']/,
  /from\s+["']mongodb["']/,
  /\.\.\/models\//,
  /\.\/models\//,
];

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (entry.name.endsWith(".js")) {
      const content = fs.readFileSync(full, "utf8");
      for (const pattern of forbiddenSourcePatterns) {
        if (pattern.test(content)) {
          errors.push(`Referência Mongo residual em ${path.relative(root, full)}: ${pattern}`);
        }
      }
    }
  }
}
walk(path.join(root, "src"));

if (!pkg.dependencies?.["@prisma/client"] || !pkg.dependencies?.["@prisma/adapter-pg"] || !pkg.dependencies?.pg) {
  errors.push("Dependências runtime do Prisma/PostgreSQL incompletas.");
}
if (!pkg.devDependencies?.prisma) errors.push("Prisma CLI não está em devDependencies.");

if (errors.length) {
  console.error("\nFalha na validação estática da migração:\n");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log("OK: migração estática Prisma/PostgreSQL consistente.");
console.log(`OK: ${expectedModels.length} models Prisma encontrados.`);
console.log(`OK: ${expectedConstraints.length} constraints/índices críticos encontrados.`);
console.log("OK: nenhuma dependência/importação Mongo residual encontrada em src/.");
