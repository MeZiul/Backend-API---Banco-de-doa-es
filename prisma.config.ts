import "dotenv/config";
import { defineConfig } from "prisma/config";

const localDatabaseUrl =
  "postgresql://doai:doai_local@localhost:5432/doai?schema=public";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "node src/seeds/seedDoaI.js",
  },
  datasource: {
    // O fallback permite `prisma generate` durante o build antes de existir .env.
    // Em execução/migrations, DATABASE_URL do ambiente sempre prevalece.
    url: process.env.DATABASE_URL || localDatabaseUrl,
  },
});
