-- PostgreSQL schema generated for the Prisma migration from MongoDB/Mongoose.
-- Partial unique indexes reproduce the conditional uniqueness rules that existed in MongoDB.

CREATE TYPE "PerfilUsuario" AS ENUM ('USUARIO', 'ADMINISTRADOR');
CREATE TYPE "SituacaoUsuario" AS ENUM ('ATIVO', 'SUSPENSO', 'INATIVO');
CREATE TYPE "CondicaoItem" AS ENUM ('NOVO', 'SEMINOVO', 'USADO_BOM', 'USADO_REGULAR');
CREATE TYPE "StatusItem" AS ENUM ('DISPONIVEL', 'RESERVADO', 'AGUARDANDO_CONFIRMACAO', 'DOADO', 'CANCELADO');
CREATE TYPE "StatusInteresse" AS ENUM ('PENDENTE', 'ACEITO', 'RECUSADO', 'CANCELADO', 'EXPIRADO');
CREATE TYPE "TipoAvaliacao" AS ENUM ('DOADOR_PARA_INTERESSADO', 'INTERESSADO_PARA_DOADOR');
CREATE TYPE "TipoAlvoDenuncia" AS ENUM ('ITEM', 'USUARIO');
CREATE TYPE "MotivoDenuncia" AS ENUM ('CONTEUDO_INAPROPRIADO', 'ITEM_PROIBIDO', 'FRAUDE', 'ASSEDIO', 'SPAM', 'OUTRO');
CREATE TYPE "StatusDenuncia" AS ENUM ('EM_ANALISE', 'PROCEDENTE', 'IMPROCEDENTE');
CREATE TYPE "TipoAcaoAdministracao" AS ENUM ('BLOQUEIO_USUARIO', 'DESBLOQUEIO_USUARIO', 'INATIVACAO_USUARIO', 'CANCELAMENTO_ITEM', 'RESOLUCAO_DENUNCIA');
CREATE TYPE "TipoAlvoAdministracao" AS ENUM ('USUARIO', 'ITEM', 'DENUNCIA');
CREATE TYPE "ResultadoDenuncia" AS ENUM ('PROCEDENTE', 'IMPROCEDENTE');
CREATE TYPE "TipoNotificacao" AS ENUM ('INTERESSE_RECEBIDO', 'INTERESSE_ACEITO', 'INTERESSE_RECUSADO', 'INTERESSE_CANCELADO', 'DOACAO_CONFIRMADA', 'AVALIACAO_RECEBIDA', 'DENUNCIA_RESULTADO', 'USUARIO_SUSPENSO', 'USUARIO_REATIVADO', 'ITEM_CANCELADO', 'SISTEMA');

CREATE TABLE "Usuario" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "cpf" TEXT NOT NULL,
    "telefone" TEXT,
    "cidade" TEXT NOT NULL,
    "uf" VARCHAR(2) NOT NULL,
    "senha" TEXT NOT NULL,
    "foto_perfil" TEXT,
    "bio" VARCHAR(500),
    "perfil" "PerfilUsuario" NOT NULL DEFAULT 'USUARIO',
    "situacao" "SituacaoUsuario" NOT NULL DEFAULT 'ATIVO',
    "motivo_suspensao" TEXT,
    "suspensao_ate" TIMESTAMP(3),
    "media_avaliacoes" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "total_avaliacoes" INTEGER NOT NULL DEFAULT 0,
    "total_doacoes" INTEGER NOT NULL DEFAULT 0,
    "token_redefinicao" TEXT,
    "token_redefinicao_expira" TIMESTAMP(3),
    "data_cadastro" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "data_atualizacao" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Usuario_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "Usuario_uf_check" CHECK (char_length("uf") = 2)
);

CREATE TABLE "Categoria" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "descricao" TEXT,
    "icone" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "ordem" INTEGER NOT NULL DEFAULT 0,
    "data_cadastro" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "data_atualizacao" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Categoria_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ItemDoacao" (
    "id" TEXT NOT NULL,
    "usuario_id" TEXT NOT NULL,
    "categoria_id" TEXT NOT NULL,
    "interesse_aceito_id" TEXT,
    "titulo" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "condicao_item" "CondicaoItem" NOT NULL,
    "cidade" TEXT NOT NULL,
    "uf" VARCHAR(2) NOT NULL,
    "bairro" TEXT,
    "condicoes_doacao" TEXT,
    "status" "StatusItem" NOT NULL,
    "motivo_cancelamento" TEXT,
    "data_doacao" TIMESTAMP(3),
    "visualizacoes" INTEGER NOT NULL DEFAULT 0,
    "total_interesses" INTEGER NOT NULL DEFAULT 0,
    "data_cadastro" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "data_atualizacao" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ItemDoacao_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "ItemDoacao_uf_check" CHECK (char_length("uf") = 2)
);

CREATE TABLE "FotoItemDoacao" (
    "id" TEXT NOT NULL,
    "item_id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "ordem" INTEGER NOT NULL,
    "nome_original" TEXT,
    "tamanho" INTEGER,
    "mime_type" TEXT,
    "data_upload" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "FotoItemDoacao_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "FotoItemDoacao_tamanho_check" CHECK ("tamanho" IS NULL OR "tamanho" >= 0),
    CONSTRAINT "FotoItemDoacao_ordem_check" CHECK ("ordem" >= 0)
);

CREATE TABLE "Interesse" (
    "id" TEXT NOT NULL,
    "item_id" TEXT NOT NULL,
    "usuario_interessado_id" TEXT NOT NULL,
    "usuario_doador_id" TEXT NOT NULL,
    "mensagem_interessado" TEXT,
    "resposta_doador" TEXT,
    "status" "StatusInteresse" NOT NULL DEFAULT 'PENDENTE',
    "data_interesse" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "data_resposta" TIMESTAMP(3),
    "data_cancelamento" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Interesse_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "Interesse_partes_distintas_check" CHECK ("usuario_interessado_id" <> "usuario_doador_id")
);

CREATE TABLE "Avaliacao" (
    "id" TEXT NOT NULL,
    "item_id" TEXT NOT NULL,
    "avaliador_id" TEXT NOT NULL,
    "avaliado_id" TEXT NOT NULL,
    "nota" INTEGER NOT NULL,
    "comentario" TEXT,
    "tipo" "TipoAvaliacao" NOT NULL,
    "data_avaliacao" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Avaliacao_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "Avaliacao_nota_check" CHECK ("nota" BETWEEN 1 AND 5),
    CONSTRAINT "Avaliacao_partes_distintas_check" CHECK ("avaliador_id" <> "avaliado_id")
);

CREATE TABLE "Denuncia" (
    "id" TEXT NOT NULL,
    "denunciante_id" TEXT NOT NULL,
    "tipo_alvo" "TipoAlvoDenuncia" NOT NULL,
    "alvo_item_id" TEXT,
    "alvo_usuario_id" TEXT,
    "motivo" "MotivoDenuncia" NOT NULL,
    "descricao" TEXT,
    "status" "StatusDenuncia" NOT NULL DEFAULT 'EM_ANALISE',
    "resposta_admin" TEXT,
    "admin_id" TEXT,
    "acao_tomada" TEXT,
    "data_denuncia" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "data_analise" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Denuncia_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "Denuncia_alvo_check" CHECK (
      ("tipo_alvo" = 'ITEM' AND "alvo_item_id" IS NOT NULL AND "alvo_usuario_id" IS NULL)
      OR
      ("tipo_alvo" = 'USUARIO' AND "alvo_usuario_id" IS NOT NULL AND "alvo_item_id" IS NULL)
    )
);

CREATE TABLE "Administracao" (
    "id" TEXT NOT NULL,
    "administrador_id" TEXT NOT NULL,
    "tipo_acao" "TipoAcaoAdministracao" NOT NULL,
    "tipo_alvo" "TipoAlvoAdministracao" NOT NULL,
    "alvo_usuario_id" TEXT,
    "alvo_item_id" TEXT,
    "alvo_denuncia_id" TEXT,
    "justificativa" VARCHAR(1000),
    "suspensao_ate" TIMESTAMP(3),
    "resultado_denuncia" "ResultadoDenuncia",
    "resposta_administrativa" VARCHAR(1000),
    "acao_tomada" VARCHAR(500),
    "data_acao" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Administracao_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "Administracao_alvo_check" CHECK (
      ("tipo_alvo" = 'USUARIO' AND "alvo_usuario_id" IS NOT NULL AND "alvo_item_id" IS NULL AND "alvo_denuncia_id" IS NULL)
      OR
      ("tipo_alvo" = 'ITEM' AND "alvo_item_id" IS NOT NULL AND "alvo_usuario_id" IS NULL AND "alvo_denuncia_id" IS NULL)
      OR
      ("tipo_alvo" = 'DENUNCIA' AND "alvo_denuncia_id" IS NOT NULL AND "alvo_usuario_id" IS NULL AND "alvo_item_id" IS NULL)
    ),
    CONSTRAINT "Administracao_resultado_check" CHECK (
      "tipo_acao" <> 'RESOLUCAO_DENUNCIA' OR "resultado_denuncia" IS NOT NULL
    ),
    CONSTRAINT "Administracao_justificativa_check" CHECK (
      "tipo_acao" <> 'BLOQUEIO_USUARIO' OR (NULLIF(btrim("justificativa"), '') IS NOT NULL)
    )
);

CREATE TABLE "Notificacao" (
    "id" TEXT NOT NULL,
    "usuario_id" TEXT NOT NULL,
    "tipo" "TipoNotificacao" NOT NULL,
    "titulo" TEXT NOT NULL,
    "mensagem" TEXT NOT NULL,
    "lida" BOOLEAN NOT NULL DEFAULT false,
    "referencia_tipo" TEXT,
    "referencia_id" TEXT,
    "data_criacao" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "data_atualizacao" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Notificacao_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Usuario_email_key" ON "Usuario"("email");
CREATE UNIQUE INDEX "Usuario_cpf_key" ON "Usuario"("cpf");
CREATE INDEX "Usuario_email_cpf_idx" ON "Usuario"("email", "cpf");
CREATE INDEX "Usuario_cidade_uf_idx" ON "Usuario"("cidade", "uf");
CREATE INDEX "Usuario_situacao_idx" ON "Usuario"("situacao");
CREATE INDEX "Usuario_perfil_idx" ON "Usuario"("perfil");

CREATE UNIQUE INDEX "Categoria_nome_key" ON "Categoria"("nome");
CREATE INDEX "Categoria_ativo_idx" ON "Categoria"("ativo");
CREATE INDEX "Categoria_ordem_idx" ON "Categoria"("ordem");

CREATE UNIQUE INDEX "ItemDoacao_interesse_aceito_id_key" ON "ItemDoacao"("interesse_aceito_id");
CREATE INDEX "ItemDoacao_usuario_id_idx" ON "ItemDoacao"("usuario_id");
CREATE INDEX "ItemDoacao_categoria_id_idx" ON "ItemDoacao"("categoria_id");
CREATE INDEX "ItemDoacao_condicao_item_idx" ON "ItemDoacao"("condicao_item");
CREATE INDEX "ItemDoacao_cidade_idx" ON "ItemDoacao"("cidade");
CREATE INDEX "ItemDoacao_uf_idx" ON "ItemDoacao"("uf");
CREATE INDEX "ItemDoacao_status_data_cadastro_idx" ON "ItemDoacao"("status", "data_cadastro" DESC);
CREATE INDEX "ItemDoacao_status_visualizacoes_idx" ON "ItemDoacao"("status", "visualizacoes" DESC);

CREATE INDEX "FotoItemDoacao_item_id_ordem_idx" ON "FotoItemDoacao"("item_id", "ordem");

CREATE INDEX "Interesse_item_id_idx" ON "Interesse"("item_id");
CREATE INDEX "Interesse_usuario_interessado_id_idx" ON "Interesse"("usuario_interessado_id");
CREATE INDEX "Interesse_usuario_doador_id_idx" ON "Interesse"("usuario_doador_id");
CREATE INDEX "Interesse_status_idx" ON "Interesse"("status");
CREATE UNIQUE INDEX "interesse_ativo_unico_por_usuario_item"
  ON "Interesse"("item_id", "usuario_interessado_id")
  WHERE "status" IN ('PENDENTE', 'ACEITO');
CREATE UNIQUE INDEX "interesse_aceito_unico_por_item"
  ON "Interesse"("item_id")
  WHERE "status" = 'ACEITO';

CREATE UNIQUE INDEX "Avaliacao_item_id_avaliador_id_tipo_key" ON "Avaliacao"("item_id", "avaliador_id", "tipo");
CREATE INDEX "Avaliacao_avaliado_id_idx" ON "Avaliacao"("avaliado_id");
CREATE INDEX "Avaliacao_item_id_idx" ON "Avaliacao"("item_id");

CREATE INDEX "Denuncia_status_data_denuncia_idx" ON "Denuncia"("status", "data_denuncia" DESC);
CREATE INDEX "Denuncia_denunciante_id_idx" ON "Denuncia"("denunciante_id");
CREATE INDEX "Denuncia_alvo_item_id_idx" ON "Denuncia"("alvo_item_id");
CREATE INDEX "Denuncia_alvo_usuario_id_idx" ON "Denuncia"("alvo_usuario_id");
CREATE INDEX "Denuncia_admin_id_idx" ON "Denuncia"("admin_id");
CREATE UNIQUE INDEX "denuncia_item_em_analise_unica_por_denunciante"
  ON "Denuncia"("denunciante_id", "alvo_item_id")
  WHERE "tipo_alvo" = 'ITEM' AND "status" = 'EM_ANALISE';
CREATE UNIQUE INDEX "denuncia_usuario_em_analise_unica_por_denunciante"
  ON "Denuncia"("denunciante_id", "alvo_usuario_id")
  WHERE "tipo_alvo" = 'USUARIO' AND "status" = 'EM_ANALISE';

CREATE INDEX "Administracao_administrador_id_data_acao_idx" ON "Administracao"("administrador_id", "data_acao" DESC);
CREATE INDEX "Administracao_alvo_usuario_id_data_acao_idx" ON "Administracao"("alvo_usuario_id", "data_acao" DESC);
CREATE INDEX "Administracao_alvo_item_id_data_acao_idx" ON "Administracao"("alvo_item_id", "data_acao" DESC);
CREATE INDEX "Administracao_alvo_denuncia_id_data_acao_idx" ON "Administracao"("alvo_denuncia_id", "data_acao" DESC);
CREATE INDEX "Administracao_tipo_acao_data_acao_idx" ON "Administracao"("tipo_acao", "data_acao" DESC);

CREATE INDEX "Notificacao_usuario_id_data_criacao_idx" ON "Notificacao"("usuario_id", "data_criacao" DESC);
CREATE INDEX "Notificacao_usuario_id_lida_idx" ON "Notificacao"("usuario_id", "lida");

ALTER TABLE "ItemDoacao" ADD CONSTRAINT "ItemDoacao_usuario_id_fkey"
  FOREIGN KEY ("usuario_id") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ItemDoacao" ADD CONSTRAINT "ItemDoacao_categoria_id_fkey"
  FOREIGN KEY ("categoria_id") REFERENCES "Categoria"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "FotoItemDoacao" ADD CONSTRAINT "FotoItemDoacao_item_id_fkey"
  FOREIGN KEY ("item_id") REFERENCES "ItemDoacao"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Interesse" ADD CONSTRAINT "Interesse_item_id_fkey"
  FOREIGN KEY ("item_id") REFERENCES "ItemDoacao"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Interesse" ADD CONSTRAINT "Interesse_usuario_interessado_id_fkey"
  FOREIGN KEY ("usuario_interessado_id") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Interesse" ADD CONSTRAINT "Interesse_usuario_doador_id_fkey"
  FOREIGN KEY ("usuario_doador_id") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ItemDoacao" ADD CONSTRAINT "ItemDoacao_interesse_aceito_id_fkey"
  FOREIGN KEY ("interesse_aceito_id") REFERENCES "Interesse"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Avaliacao" ADD CONSTRAINT "Avaliacao_item_id_fkey"
  FOREIGN KEY ("item_id") REFERENCES "ItemDoacao"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Avaliacao" ADD CONSTRAINT "Avaliacao_avaliador_id_fkey"
  FOREIGN KEY ("avaliador_id") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Avaliacao" ADD CONSTRAINT "Avaliacao_avaliado_id_fkey"
  FOREIGN KEY ("avaliado_id") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Denuncia" ADD CONSTRAINT "Denuncia_denunciante_id_fkey"
  FOREIGN KEY ("denunciante_id") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Denuncia" ADD CONSTRAINT "Denuncia_alvo_item_id_fkey"
  FOREIGN KEY ("alvo_item_id") REFERENCES "ItemDoacao"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Denuncia" ADD CONSTRAINT "Denuncia_alvo_usuario_id_fkey"
  FOREIGN KEY ("alvo_usuario_id") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Denuncia" ADD CONSTRAINT "Denuncia_admin_id_fkey"
  FOREIGN KEY ("admin_id") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Administracao" ADD CONSTRAINT "Administracao_administrador_id_fkey"
  FOREIGN KEY ("administrador_id") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Administracao" ADD CONSTRAINT "Administracao_alvo_usuario_id_fkey"
  FOREIGN KEY ("alvo_usuario_id") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Administracao" ADD CONSTRAINT "Administracao_alvo_item_id_fkey"
  FOREIGN KEY ("alvo_item_id") REFERENCES "ItemDoacao"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Administracao" ADD CONSTRAINT "Administracao_alvo_denuncia_id_fkey"
  FOREIGN KEY ("alvo_denuncia_id") REFERENCES "Denuncia"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Notificacao" ADD CONSTRAINT "Notificacao_usuario_id_fkey"
  FOREIGN KEY ("usuario_id") REFERENCES "Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;
