# Backend API - Banco de Doações (DoaI)

API backend do projeto acadêmico DoaI, construída com Node.js/Express e persistência relacional em **PostgreSQL + Prisma ORM**.

> A camada MongoDB/Mongoose foi removida em 18/08/2026. O contrato HTTP foi preservado sempre que possível, inclusive o campo `_id` nas respostas. Os IDs novos são UUIDs gerados pelo Prisma.

## Stack

- Node.js 20.19+ na linha 20, 22.12+ na linha 22, ou Node 24 (Docker usa Node 24)
- Express 5
- PostgreSQL 18
- Prisma ORM 7
- `@prisma/adapter-pg` + `pg`
- Better Auth 1.7 com sessões persistidas e Bearer plugin
- BcryptJS
- Zod 4 para Better Auth e alias Zod 3 para os schemas legados da API
- Jest + Supertest
- Swagger
- Winston

## Estrutura de persistência

```text
routes
  -> controllers
    -> services
      -> repositories
        -> Prisma Client
          -> PostgreSQL
```

O schema fica em `prisma/schema.prisma` e as migrations em `prisma/migrations/`.

Entidades relacionais principais:

- `Usuario`
- `Categoria`
- `ItemDoacao`
- `FotoItemDoacao`
- `Interesse`
- `Avaliacao`
- `Denuncia`
- `Administracao`
- `Notificacao`
- `Account`
- `Session`
- `Verification`

`ItemDoacao.fotos[]`, antes embutido no MongoDB, virou a relação `ItemDoacao 1:N FotoItemDoacao`.

A referência polimórfica de `Administracao.alvo_id` foi normalizada em três FKs opcionais (`alvo_usuario_id`, `alvo_item_id`, `alvo_denuncia_id`) protegidas por `CHECK` no PostgreSQL. A API continua expondo `alvo_id`/`alvo_model` pela camada de compatibilidade do repository.

## Pré-requisitos

### Caminho recomendado

- Docker Desktop / Docker Engine com Compose
- Node.js compatível com Prisma 7 (`^20.19`, `^22.12` ou `^24`) e npm, caso a API seja executada fora do container

## Configuração inicial

Crie o `.env` a partir do exemplo.

Windows CMD:

```bat
copy .env.example .env
```

PowerShell:

```powershell
Copy-Item .env.example .env
```

Linux/macOS/Git Bash:

```bash
cp .env.example .env
```

O `.env.example` contém apenas valores locais/placeholder. Não versione credenciais reais.

Para autenticação, defina obrigatoriamente:

- `BETTER_AUTH_SECRET`: segredo aleatório exclusivo com pelo menos 32 caracteres;
- `BETTER_AUTH_URL`: origem pública da API, sem `/docs` e sem barra final;
- `BETTER_AUTH_TRUSTED_ORIGINS`: origens permitidas separadas por vírgula.

As credenciais ficam em `Account`, as sessões revogáveis em `Session` e os tokens temporários de recuperação em `Verification`. As rotas protegidas recebem o token opaco de sessão no header `Authorization: Bearer <token>`. Não é JWT e não deve ser decodificado pelo cliente.

## Opção A - tudo em Docker

Esta é a forma mais simples para validar a branch após o clone:

```bash
docker compose up --build -d
```

O container da API aguarda o PostgreSQL ficar saudável, aplica as migrations com `prisma migrate deploy` e inicia o servidor.

O Compose publica a porta interna `7340` na porta definida por `API_HOST_PORT`. O valor padrão do exemplo é `7340`, portanto o desenvolvimento local continua usando `http://localhost:7340`.

URLs padrão:

- API: `http://localhost:7340`
- Swagger: `http://localhost:7340/docs`
- JSON Swagger: `http://localhost:7340/docs.json`
- PostgreSQL: `localhost:5432`
- PostgreSQL exclusivo de testes: `localhost:5433`

Em uma VM que recebe HTTP somente pela porta 80 e fica atrás de um gateway reverso, configure `API_HOST_PORT=80` e `TRUST_PROXY_HOPS=1` no `.env` da própria VM e recrie o serviço:

```bash
docker compose up --build -d
```

Nesse cenário, o mapeamento efetivo é `80:7340`: a porta 80 do host encaminha as requisições para a porta 7340 onde o Node.js escuta dentro do container. Não use `80:80` sem também alterar a porta interna da aplicação.

`TRUST_PROXY_HOPS=1` informa ao Express que existe um proxy reverso entre o cliente e a API. Isso permite que os rate limiters usem o IP encaminhado pelo gateway. Mantenha `0` quando a aplicação for acessada diretamente, sem proxy confiável.

Para acompanhar os logs:

```bash
docker compose logs -f api
```

Para parar:

```bash
docker compose down
```

Para apagar também os dados locais do PostgreSQL:

```bash
docker compose down -v
```

## Opção B - PostgreSQL no Docker e API no host

Suba os bancos de desenvolvimento e de teste:

```bash
docker compose up -d postgres postgres-test
```

Instale as dependências:

```bash
npm ci
```

Os scripts `dev`, `start`, `test`, `test:coverage` e `test:db` geram o Prisma Client antes de executar. O comando manual `npm run prisma:generate` continua disponível após alterações no schema.

Aplique todas as migrations pendentes:

```bash
npm run db:migrate:deploy
```

Opcionalmente carregue a massa de demonstração:

```bash
npm run db:seed
```

Inicie em modo desenvolvimento:

```bash
npm run dev
```

## Seed

O seed foi portado para Prisma/PostgreSQL e mantém os usuários e cenários de demonstração do projeto.

```bash
npm run db:seed
```

Credenciais padrão de desenvolvimento:

- Administrador: `admin@doai.com` / valor de `ADMIN_SENHA` (por padrão `Admin@123`)
- Usuário comum: `carlos@email.com` / `Senha@123`
- Usuário suspenso: `roberto@email.com` / `Senha@123`
- Usuário inativo: `inativo@doai.com` / `Senha@123`

O seed **limpa e recria a massa local**. Não execute contra um banco que contenha dados que você queira preservar.

O seed cria cada usuário de domínio e sua credencial Better Auth correspondente. As senhas são armazenadas exclusivamente como hash bcrypt em `Account.password`.

A migração atual cria o schema PostgreSQL, mas não transfere registros de uma instalação MongoDB antiga. Para este projeto acadêmico, os dados locais são descartáveis e a massa oficial de desenvolvimento é recriada pelo seed.

## Prisma

Comandos principais:

```bash
npm run prisma:generate
npm run db:validate
npm run db:migrate:deploy
npm run db:migrate:dev
npm run db:seed
npm run db:studio
```

### Ao alterar o schema durante o desenvolvimento

1. Edite `prisma/schema.prisma`.
2. Com o PostgreSQL local ativo, execute:

```bash
npm run db:migrate:dev -- --name descricao_da_mudanca
```

3. Revise o SQL gerado em `prisma/migrations/`.
4. Execute os testes antes do commit.
5. Versione **schema + migration + código** juntos.

A migration inicial contém índices parciais e `CHECK constraints` adicionados em SQL para preservar regras que eram condicionais no MongoDB. Não remova esses trechos sem revisar as regras de negócio.

## Testes

Testes unitários/HTTP:

```bash
npm test
```

Cobertura:

```bash
npm run test:coverage
```

Validação estática específica da migração:

```bash
npm run check:migration
```

Testes sem dependência externa da camada de compatibilidade Mongo -> Prisma:

```bash
npm run test:compat
```

Smoke test real do Prisma/PostgreSQL (exige `postgres-test` ativo):

```bash
npm run test:db
```

O smoke test exige `TEST_DATABASE_URL`, aplica as migrations somente nesse banco, percorre os repositórios reais, valida relações e força rollback ao final. Ele nunca usa `DATABASE_URL` como fallback e não deixa massa de teste persistida.

Validação da migração de credenciais antigas, inteiramente revertida ao final:

```bash
npm run test:auth:migration
```

Smoke real do Better Auth, usando somente o banco de teste:

```bash
npm run test:auth
npm run test:auth:http
```

O primeiro smoke cria um usuário temporário e valida diretamente `Account`, login, bearer, consulta e revogação. O smoke HTTP percorre as rotas reais `/usuario` e `/auth/*`, incluindo refresh e rejeição dos tokens antigos. Ambos removem seus registros ao final. Execute antes `docker compose up -d postgres-test` e `npm run test:db` para garantir que as migrations estejam aplicadas.

## Autenticação

Os contratos públicos do DoaI foram preservados:

- `POST /usuario`: cadastro validado pelas regras de negócio do projeto;
- `POST /auth/login`: retorna `{ token, usuario }`;
- `POST /auth/logout`: revoga a sessão atual no PostgreSQL;
- `POST /auth/refresh-token`: rotaciona o token atual e invalida imediatamente o anterior;
- `POST /auth/esqueci-senha` e `PUT /auth/redefinir-senha`: recuperação com tokens temporários do Better Auth.

O handler oficial existe em `/api/auth/*`, mas os endpoints nativos que alterariam cadastro, credenciais ou dados do usuário são bloqueados. Isso impede contornar os schemas Zod, as regras de CPF, a situação da conta e a autorização do domínio. Use sempre as rotas públicas do DoaI listadas acima.

## Compatibilidade de IDs

Novos registros usam UUID. Para não quebrar fixtures e integrações antigas durante a transição, os validators aceitam temporariamente:

- UUID;
- ObjectId legado com 24 caracteres hexadecimais.

A persistência PostgreSQL usa os UUIDs reais. A camada de repository converte o `id` do Prisma para `_id` nas respostas legadas da API.

Quando o frontend estiver totalmente estabilizado, o grupo pode decidir em uma mudança separada se deseja padronizar o contrato HTTP em `id` e remover a aceitação de ObjectId legado.

## Documentação da API

Contrato funcional base:

- [Documentação da API Banco de Doação](./documentacao/Documenta%C3%A7%C3%A3o_da_api_Banco_de_Doa%C3%A7%C3%A3o.md)
- [Especificação API REST DoaI](./documentacao/Especificacao_API_REST_DoaI.html)

Rotas:

- [Autenticação](./documentacao/rotas/rotas-autenticacao.md)
- [Migração para Better Auth](./documentacao/migracao-better-auth.md)
- [Administração](./documentacao/rotas/rotas-administracao.md)
- [Interesse](./documentacao/rotas/rotas-interesse.md)
- [Denúncia](./documentacao/rotas/rotas-denuncia.md)
- [Avaliação](./documentacao/rotas/rotas-avaliacao.md)
- [Usuário](./documentacao/rotas/rotas-usuario.md)

Alguns documentos de milestone preservam referências históricas a MongoDB/Mongoose porque descrevem o estado anterior do projeto. Para configuração e execução atuais, este README é a fonte operacional de verdade.

## Scripts

| Script | Função |
|---|---|
| `npm run dev` | inicia a API com Nodemon |
| `npm start` | inicia a API com Node |
| `npm test` | executa a suíte Jest |
| `npm run test:coverage` | executa Jest com cobertura |
| `npm run check:migration` | auditoria estática Mongo -> Prisma |
| `npm run test:compat` | testa filtros, paginação e compatibilidade `_id` sem banco |
| `npm run test:db` | smoke test real Prisma/PostgreSQL |
| `npm run test:auth:migration` | valida o backfill de hashes antigos em transação revertida |
| `npm run test:auth` | smoke real de cadastro, sessão Bearer e logout Better Auth |
| `npm run test:auth:http` | smoke HTTP real das rotas de usuário e autenticação |
| `npm run prisma:generate` | gera Prisma Client |
| `npm run db:validate` | valida `schema.prisma` |
| `npm run db:migrate:deploy` | aplica migrations existentes |
| `npm run db:migrate:dev` | cria/aplica nova migration em desenvolvimento |
| `npm run db:seed` | executa o seed configurado no Prisma |
| `npm run db:studio` | abre Prisma Studio |

## Observação de segurança

O antigo arquivo `.env EXAMPLE` foi substituído por `.env.example` sanitizado. Se alguma credencial real chegou a ser versionada anteriormente no repositório, ela deve ser rotacionada no serviço correspondente, pois removê-la do commit atual não a remove do histórico Git.
