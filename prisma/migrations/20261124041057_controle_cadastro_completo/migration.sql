-- AlterTable
ALTER TABLE "Usuario"
ADD COLUMN "cadastro_completo" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "termos_aceitos_em" TIMESTAMP(3),
ADD COLUMN "versao_termos" TEXT;

-- Preserva os cadastros existentes com dados obrigatórios.
UPDATE "Usuario"
SET "cadastro_completo" = true
WHERE
    NULLIF(TRIM("cpf"), '') IS NOT NULL
    AND NULLIF(TRIM("cidade"), '') IS NOT NULL
    AND NULLIF(TRIM("uf"), '') IS NOT NULL;