# Guia offline para criar uma rota completa

Este guia descreve o estado atual do projeto DoaI: **Node.js ESM, Express 5, Prisma 7 e PostgreSQL 18**. Ele serve como consulta local para implementar uma nova funcionalidade sem internet, mantendo o padrão do repositório.

## 1. Arquitetura obrigatória

```text
HTTP request
  -> Route
    -> Middlewares
      -> Controller
        -> Zod
          -> Service
            -> Repository
              -> Prisma Client
                -> PostgreSQL
```

Responsabilidades:

| Camada | Responsabilidade |
|---|---|
| Route | Define método, URL, autenticação, autorização e controller. |
| Middleware | Valida identidade e condições de acesso comuns. |
| Controller | Faz parse de params/query/body, chama o service e monta a resposta HTTP. |
| Service | Implementa regras de negócio, permissões, estados e transações compostas. |
| Repository | Encapsula consultas e mutações Prisma. |
| Prisma schema | Define modelos, relações, enums, índices e constraints básicas. |
| Migration | Versiona o SQL necessário para alterar o PostgreSQL. |
| Zod | Valida e normaliza o contrato recebido pela API. |
| Swagger/Markdown | Documenta contrato HTTP e regras de negócio. |
| Testes | Provam regras isoladas, contrato HTTP e integração real com PostgreSQL. |

Regras de separação:

- Route não acessa repository nem Prisma.
- Controller não contém regra de negócio.
- Service não monta query Prisma extensa.
- Repository não decide permissão HTTP.
- Nunca importar `PrismaClient` diretamente em route, controller ou service.
- Nunca usar `DATABASE_URL` em teste real. O projeto exige `TEST_DATABASE_URL`.

## 2. Ordem segura de implementação

1. Ler um módulo semelhante já pronto.
2. Definir endpoints, atores, estados e respostas esperadas.
3. Alterar `prisma/schema.prisma` se a funcionalidade exigir persistência nova.
4. Criar e revisar a migration.
5. Criar repository.
6. Criar service.
7. Criar container de dependências.
8. Exportar o service em `src/containers/services.index.js`.
9. Criar schemas Zod de body, query, params e resposta.
10. Criar controller.
11. Criar route.
12. Registrar a route em `src/routes/index.js`.
13. Criar Swagger schema e path.
14. Registrar Swagger em `src/docs/config/head.js`.
15. Criar documentação Markdown da rota e plano de teste.
16. Criar testes de service e endpoint.
17. Rodar validações unitárias, de contrato e com PostgreSQL de teste.

Antes de editar, use como referência:

- Fluxo simples: Categoria.
- Autenticação e usuário: Usuário.
- Estados e concorrência: Interesse.
- Auditoria e transação composta: Administração.
- Upload/relação 1:N: Item de Doação e `FotoItemDoacao`.

## 3. Exemplo de domínio: Favorito

O exemplo abaixo usa até três endpoints:

```text
POST   /favoritos
GET    /favoritos
DELETE /favoritos/:id
```

Regras de exemplo:

- Apenas usuário autenticado e ativo pode favoritar.
- O item precisa existir e estar disponível.
- O usuário não pode favoritar o próprio item.
- O mesmo usuário não pode favoritar o mesmo item duas vezes.
- Só o dono do favorito pode removê-lo.

Substitua `Favorito` pelo domínio solicitado na prova, mas preserve as camadas.

## 4. Prisma model e migration

No `prisma/schema.prisma`, adicione o model e as relações reversas:

```prisma
model Favorito {
  id           String   @id @default(uuid())
  usuario_id   String
  item_id      String
  data_criacao DateTime @default(now())

  usuario Usuario    @relation(fields: [usuario_id], references: [id], onDelete: Cascade)
  item    ItemDoacao @relation(fields: [item_id], references: [id], onDelete: Cascade)

  @@unique([usuario_id, item_id])
  @@index([usuario_id, data_criacao(sort: Desc)])
  @@index([item_id])
}
```

Também inclua `favoritos Favorito[]` em `Usuario` e `ItemDoacao`.

Valide o schema:

```bash
npm run db:validate
npm run prisma:generate
```

Com o banco de desenvolvimento ativo, crie a migration:

```bash
npm run db:migrate:dev -- --name adicionar_favoritos
```

Revise o SQL em `prisma/migrations/<timestamp>_adicionar_favoritos/migration.sql`. Confirme tabelas, FKs, `ON DELETE`, índices e unique constraints. Nunca edite uma migration já aplicada em ambiente compartilhado; crie outra.

Se estiver completamente offline e a migration já existir no repositório:

```bash
npm run db:migrate:deploy
```

## 5. Repository

Arquivo: `src/repositories/FavoritoRepository.js`

```js
import BaseRepository from "./base/BaseRepository.js";

const RELATIONS = {
  usuario_id: "usuario",
  item_id: "item",
};

class FavoritoRepository extends BaseRepository {
  constructor() {
    super("favorito", {
      relationMap: RELATIONS,
      defaultInclude: {
        item: {
          select: {
            id: true,
            titulo: true,
            status: true,
            cidade: true,
            uf: true,
          },
        },
      },
    });
  }

  async buscarPorUsuarioEItem(usuarioId, itemId) {
    const record = await this.delegate.findUnique({
      where: {
        usuario_id_item_id: {
          usuario_id: String(usuarioId),
          item_id: String(itemId),
        },
      },
      include: this.defaultInclude,
    });

    return this.mapRecord(record);
  }

  listarPorUsuario(usuarioId, { page = 1, limit = 15 } = {}) {
    return this.listarComPaginacao(
      { usuario_id: String(usuarioId) },
      { page, limit, sort: { data_criacao: -1 } },
    );
  }
}

export default FavoritoRepository;
```

O `BaseRepository` já fornece `criar`, `buscarPorId`, `atualizar`, `deletar` e paginação. Ele também converte `id` do Prisma para `_id` no contrato legado.

Erros `P2002` são convertidos pela camada de compatibilidade para o formato já tratado pelos services. Ainda assim, a unique constraint no banco é obrigatória para impedir corrida entre requisições.

## 6. Service e regras de negócio

Arquivo: `src/services/FavoritoService.js`

```js
import { CustomError, messages } from "../utils/helpers/index.js";

class FavoritoService {
  constructor({ favoritoRepository, itemDoacaoRepository }) {
    this.repository = favoritoRepository;
    this.itemDoacaoRepository = itemDoacaoRepository;
  }

  async criar({ item_id }, usuario) {
    const usuarioId = this.getActorId(usuario);
    const item = await this.itemDoacaoRepository.buscarPorId(item_id);

    if (!item) {
      throw new CustomError({
        statusCode: 404,
        customMessage: messages.error.resourceNotFound("Item"),
      });
    }
    if (item.status !== "DISPONIVEL") {
      throw new CustomError({
        statusCode: 409,
        customMessage: "Apenas itens disponíveis podem ser favoritados.",
      });
    }
    if (String(item.usuario_id?._id ?? item.usuario_id) === usuarioId) {
      throw new CustomError({
        statusCode: 400,
        customMessage: "O usuário não pode favoritar o próprio item.",
      });
    }

    try {
      return await this.repository.criar({
        usuario_id: usuarioId,
        item_id,
      });
    } catch (error) {
      if (error?.code === 11000) {
        throw new CustomError({
          statusCode: 409,
          customMessage: "O item já está nos favoritos.",
        });
      }
      throw error;
    }
  }

  listar({ page = 1, limit = 15 }, usuario) {
    return this.repository.listarPorUsuario(this.getActorId(usuario), {
      page: Number(page),
      limit: Number(limit),
    });
  }

  async remover(id, usuario) {
    const favorito = await this.repository.buscarPorId(id);
    if (!favorito) {
      throw new CustomError({
        statusCode: 404,
        customMessage: messages.error.resourceNotFound("Favorito"),
      });
    }
    if (String(favorito.usuario_id?._id ?? favorito.usuario_id) !== this.getActorId(usuario)) {
      throw new CustomError({
        statusCode: 403,
        customMessage: "Apenas o dono pode remover este favorito.",
      });
    }
    return this.repository.deletar(id);
  }

  getActorId(usuario) {
    const id = usuario?.id ?? usuario?._id;
    if (!id) {
      throw new CustomError({ statusCode: 401, customMessage: "Usuário não autenticado." });
    }
    return String(id);
  }
}

export default FavoritoService;
```

### Operações com mais de uma escrita

Se uma regra alterar dois ou mais registros que precisam confirmar juntos, injete `prismaTransactionManager` no container e use:

```js
const resultado = await this.transactionManager.run(async () => {
  const primeiro = await this.repository.atualizarSeStatus(id, "PENDENTE", dados);
  if (!primeiro) throw this.createConflictError("Estado alterado por outra operação.");

  const segundo = await this.outroRepository.criar(auditoria);
  return { primeiro, segundo };
});
```

Todos os repositories chamados dentro do callback usam o mesmo Prisma transaction client. Não crie compensações manuais para “desfazer” atualizações. Notificações e integrações externas devem ocorrer depois do commit.

## 7. Container e export central

Arquivo: `src/containers/services.favorito.container.js`

```js
import FavoritoRepository from "../repositories/FavoritoRepository.js";
import ItemDoacaoRepository from "../repositories/ItemDoacaoRepository.js";
import FavoritoService from "../services/FavoritoService.js";

const favoritoService = new FavoritoService({
  favoritoRepository: new FavoritoRepository(),
  itemDoacaoRepository: new ItemDoacaoRepository(),
});

export { favoritoService };
```

Em `src/containers/services.index.js`:

```js
export { favoritoService } from "./services.favorito.container.js";
```

Para transação composta:

```js
import prismaTransactionManager from "../infra/PrismaTransactionManager.js";

const favoritoService = new FavoritoService({
  favoritoRepository,
  itemDoacaoRepository,
  transactionManager: prismaTransactionManager,
});
```

## 8. Schemas Zod

Arquivo: `src/utils/validators/schemas/zod/FavoritoSchema.js`

```js
import { z } from "zod";
import objectIdSchema from "./ObjectIdSchema.js";

export const FavoritoSchema = z.object({
  item_id: objectIdSchema.optional(),
  itemId: objectIdSchema.optional(),
})
  .superRefine((data, ctx) => {
    if (!data.item_id && !data.itemId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["item_id"],
        message: "item_id é obrigatório.",
      });
    }
  })
  .transform((data) => ({ item_id: data.item_id ?? data.itemId }));

export const FavoritoIdSchema = objectIdSchema;

export const FavoritoQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(15),
});

export const FavoritoResponseSchema = z.object({
  _id: objectIdSchema,
  usuario_id: objectIdSchema,
  item_id: objectIdSchema,
  data_criacao: z.string().datetime(),
}).strict();
```

Use `objectIdSchema`: ele aceita UUIDs atuais e ObjectIds legados. Não valide IDs Prisma apenas por tamanho.

## 9. Controller

Arquivo: `src/controllers/FavoritoController.js`

```js
import { favoritoService } from "../containers/services.index.js";
import CommonResponse from "../utils/helpers/CommonResponse.js";
import {
  FavoritoIdSchema,
  FavoritoQuerySchema,
  FavoritoSchema,
} from "../utils/validators/schemas/zod/FavoritoSchema.js";

class FavoritoController {
  criar = async (req, res, next) => {
    try {
      const dados = FavoritoSchema.parse(req.body);
      return CommonResponse.created(res, await favoritoService.criar(dados, req.user));
    } catch (error) {
      next(error);
    }
  };

  listar = async (req, res, next) => {
    try {
      const query = FavoritoQuerySchema.parse(req.query ?? {});
      return CommonResponse.success(res, await favoritoService.listar(query, req.user));
    } catch (error) {
      next(error);
    }
  };

  remover = async (req, res, next) => {
    try {
      FavoritoIdSchema.parse(req.params.id);
      return CommonResponse.success(res, await favoritoService.remover(req.params.id, req.user));
    } catch (error) {
      next(error);
    }
  };
}

export default new FavoritoController();
```

## 10. Route e registro

Arquivo: `src/routes/favoritoRoutes.js`

```js
import express from "express";
import FavoritoController from "../controllers/FavoritoController.js";
import AuthMiddleware from "../middlewares/AuthMiddleware.js";
import EnsureActiveUserMiddleware from "../middlewares/EnsureActiveUserMiddleware.js";
import { asyncWrapper } from "../utils/helpers/index.js";

const router = express.Router();
const activeUserOnly = [AuthMiddleware, EnsureActiveUserMiddleware];

router
  .post("/favoritos", ...activeUserOnly, asyncWrapper(FavoritoController.criar))
  .get("/favoritos", ...activeUserOnly, asyncWrapper(FavoritoController.listar))
  .delete("/favoritos/:id", ...activeUserOnly, asyncWrapper(FavoritoController.remover));

export default router;
```

Em `src/routes/index.js`:

```js
import favorito from "./favoritoRoutes.js";

// dentro de routes(app)
app.use(favorito);
```

Sem esse registro, o arquivo existe mas a API responde 404.

## 11. Swagger

Crie:

- `src/docs/schemas/favoritoSchema.js`
- `src/docs/paths/favorito.js`

No schema, documente request, resposta e paginação. No path, documente os três endpoints, sessão Better Auth via Bearer, params/query/body, códigos `200`, `201`, `400`, `403`, `404`, `409` e respostas comuns.

Depois importe e espalhe os objetos em `src/docs/config/head.js`, seguindo `itemDoacaoSchema.js` e `interesse.js`:

```js
import favoritoSchemas from "../schemas/favoritoSchema.js";
import favoritoPaths from "../paths/favorito.js";

// components.schemas
...favoritoSchemas,

// paths
...favoritoPaths,
```

Valide no navegador:

```text
http://localhost:7340/docs
http://localhost:7340/docs.json
```

## 12. Documentação Markdown

Crie `documentacao/rotas/rotas-favorito.md` com:

1. Objetivo do módulo.
2. Atores e permissões.
3. Regras de negócio numeradas.
4. Máquina de estados, se existir.
5. Endpoints com request e response.
6. Erros por endpoint.
7. Concorrência e constraints.
8. Exemplos de fluxo principal.

Crie `documentacao/doc-service/Favorito.md` com o plano de teste: objetivo, métodos, mocks, cenários positivos/negativos, comandos e resultado real obtido.

## 13. Teste unitário de service

Arquivo: `src/tests/services/FavoritoService.spec.js`

Teste no mínimo:

- cria com item disponível;
- rejeita item inexistente;
- rejeita item indisponível;
- rejeita item do próprio usuário;
- converte duplicidade em 409;
- lista somente os favoritos do ator;
- impede outro usuário de remover;
- remove pelo dono.

Estrutura:

```js
import { beforeEach, describe, expect, jest, test } from "@jest/globals";
import FavoritoService from "../../services/FavoritoService.js";

describe("FavoritoService", () => {
  let favoritoRepository;
  let itemDoacaoRepository;
  let service;

  beforeEach(() => {
    favoritoRepository = {
      criar: jest.fn(),
      buscarPorId: jest.fn(),
      listarPorUsuario: jest.fn(),
      deletar: jest.fn(),
    };
    itemDoacaoRepository = { buscarPorId: jest.fn() };
    service = new FavoritoService({ favoritoRepository, itemDoacaoRepository });
  });

  test("cria favorito para item disponível de outro usuário", async () => {
    itemDoacaoRepository.buscarPorId.mockResolvedValue({
      _id: "item-id",
      usuario_id: "doador-id",
      status: "DISPONIVEL",
    });
    favoritoRepository.criar.mockResolvedValue({ _id: "favorito-id" });

    await expect(
      service.criar({ item_id: "item-id" }, { id: "interessado-id" }),
    ).resolves.toMatchObject({ _id: "favorito-id" });
  });
});
```

Use IDs válidos do helper `src/tests/test.js` quando o Zod ou a route forem exercitados.

## 14. Teste de route/endpoint

Arquivo: `src/tests/routes/favorito.spec.js`

O teste de endpoint deve usar `express`, `supertest`, router real e mocks do container. Valide:

- sem token retorna o código adotado pelo middleware (`498` neste projeto);
- body inválido retorna `400` e não chama o service;
- token de usuário inativo/suspenso é rejeitado;
- body válido chama o service com dados normalizados e `req.user`;
- resposta criada retorna `201` no shape `CommonResponse`;
- ID inválido retorna `400`;
- erro do service preserva `403`, `404` ou `409`.

Use `src/tests/routes/interesse.spec.js` como modelo. O objetivo não é mockar o router: o router, controller, Zod, autenticação e error handler devem ser reais; apenas dependências de service/repository são isoladas.

## 15. Teste real com PostgreSQL

Os testes Jest normais são isolados e não precisam de banco. Para validar migration, Prisma e repositories reais:

```bash
docker compose up -d postgres-test
npm run test:db
```

Regras de segurança:

- `NODE_ENV=test` exige `TEST_DATABASE_URL`.
- Não existe fallback para `DATABASE_URL`.
- O smoke aplica migrations no banco de teste.
- O smoke executa dentro de uma transação e força rollback.
- Não use o seed para executar testes unitários.

Ao adicionar um model público, atualize `src/utils/verificarParidadeSchemas.js` e seu `ResponseSchema` Zod. O servidor reprova startup quando Prisma e Zod discordam.

## 16. Docker e execução offline no Linux

### 16.1 Preparação enquanto ainda há internet

Execute antes de desconectar:

```bash
cp .env.example .env
npm ci
npm run prisma:generate
docker compose pull
docker compose build api
docker compose up -d postgres postgres-test
npm run test:db
docker compose down
```

Confirme as imagens locais:

```bash
docker image inspect node:24-alpine >/dev/null
docker image inspect postgres:18-alpine >/dev/null
docker compose build api
```

O build offline depende das imagens, do cache do Docker e/ou do cache npm já existirem. Não execute `docker compose down -v` antes da prova se precisar preservar bancos preparados.

### 16.2 Rodar tudo com Compose

```bash
docker compose up --build -d
docker compose ps
docker compose logs --tail=100 api
```

O serviço `api` aguarda `postgres`, aplica `prisma migrate deploy` e inicia em `0.0.0.0:7340`.

URLs:

```text
API:      http://localhost:7340
Swagger:  http://localhost:7340/docs
JSON:     http://localhost:7340/docs.json
Postgres: localhost:5432
Teste:    localhost:5433
```

Seed de demonstração dentro do container:

```bash
docker compose exec api npm run db:seed
```

O seed apaga e recria a massa local. Não rode em banco com dados importantes.

### 16.3 API no host e bancos no Docker

```bash
docker compose up -d postgres postgres-test
npm ci --offline
npm run db:migrate:deploy
npm run dev
```

`npm ci --offline` só funciona se o cache npm já tiver todas as dependências. Se não tiver, use a imagem da API previamente construída.

### 16.4 Rebuild depois de alterar código

```bash
docker compose build api
docker compose up -d api
docker compose logs --tail=100 api
```

O Dockerfile mantém a instalação de dependências em uma camada baseada apenas em `package.json` e `package-lock.json`. Alterar `src/` ou `prisma/` não deve refazer `npm ci` se o cache da imagem estiver disponível.

### 16.5 Parar e limpar

```bash
docker compose down
```

Somente se quiser apagar os dois bancos locais:

```bash
docker compose down -v
```

## 17. Comandos de validação

Validação rápida da nova funcionalidade:

```bash
npm test -- --runInBand src/tests/services/FavoritoService.spec.js
npm test -- --runInBand src/tests/routes/favorito.spec.js
```

Validação geral:

```bash
npm test
npm run test:coverage
npm run test:compat
npm run check:migration
npm run db:validate
docker compose up -d postgres-test
npm run test:db
```

Validação Docker:

```bash
docker compose config --quiet
docker compose up --build -d
docker compose ps
docker compose logs --tail=100 api
```

Verificação Git:

```bash
git status --short
git diff --stat
git diff --check
git diff
```

## 18. Erros comuns

### `TEST_DATABASE_URL não foi definida`

O teste real não usa o banco principal. Crie o `.env` a partir de `.env.example` e suba `postgres-test` na porta 5433.

### `P1001` ou conexão recusada

Confira:

```bash
docker compose ps
docker compose logs postgres
docker compose logs postgres-test
```

No host, a URL usa `localhost`. Dentro do Compose, a API usa o hostname `postgres` configurado em `docker-compose.yml`.

### `Prisma Client did not initialize yet`

```bash
npm run prisma:generate
```

Depois reinicie o processo Node.

### `P2025`

O registro deixou de existir ou não corresponde ao filtro. Repositories do projeto normalmente convertem isso em `null`; o service decide entre 404 e 409.

### `P2002`

Uma unique constraint foi violada. Converta a corrida para uma resposta `409`, mas mantenha a constraint no PostgreSQL.

### API inicia, mas a rota retorna 404

Confirme que a route foi importada e registrada com `app.use(...)` em `src/routes/index.js`.

### Swagger não mostra o endpoint

Confirme imports e spreads do schema/path em `src/docs/config/head.js` e reinicie a API.

### Swagger não abre totalmente offline

O Swagger UI usa os assets locais da dependência `swagger-ui-express`, sem depender de CDN. Se `/docs.json` funcionar e `/docs` ficar vazio, confirme que `npm ci` foi executado, que os arquivos `/docs/swagger-ui-bundle.js`, `/docs/swagger-ui.css` e `/docs/swagger-ui-init.js` respondem com HTTP 200 e que a política CSP não foi alterada para bloquear scripts da própria API.

## 19. Checklist final de uma rota completa

- [ ] Endpoints e regras de negócio definidos.
- [ ] Model/relações Prisma criados ou reutilizados.
- [ ] Migration criada e SQL revisado.
- [ ] Repository sem lógica HTTP.
- [ ] Service com permissões, estados e conflitos.
- [ ] Transação real para múltiplas escritas atômicas.
- [ ] Container criado e exportado.
- [ ] Schemas Zod de body/query/params/resposta.
- [ ] Controller usando `CommonResponse` e encaminhando erros.
- [ ] Route com autenticação/autorização correta.
- [ ] Route registrada em `src/routes/index.js`.
- [ ] Swagger schema/path registrados.
- [ ] Markdown da rota e plano de teste atualizados.
- [ ] Testes positivos, negativos, autorização e concorrência.
- [ ] Teste de endpoint com router real.
- [ ] Paridade Prisma/Zod atualizada.
- [ ] `npm test` verde.
- [ ] `npm run test:db` verde no banco exclusivo de testes.
- [ ] Docker Compose sobe API e PostgreSQL.
- [ ] `git diff --check` sem erros.
