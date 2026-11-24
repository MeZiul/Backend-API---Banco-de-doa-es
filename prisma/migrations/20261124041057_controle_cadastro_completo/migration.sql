-- AlterTable
ALTER TABLE "Usuario" ADD COLUMN     "cadastro_completo" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "termos_aceitos_em" TIMESTAMP(3),
ADD COLUMN     "versao_termos" TEXT;
