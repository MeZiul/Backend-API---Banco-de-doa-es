# Guia offline para criar uma rota completa

> **Nota de migração (18/08/2026):** este documento foi produzido antes da migração de persistência e pode conter referências históricas a MongoDB/Mongoose. O runtime atual usa Prisma + PostgreSQL. Para setup e comandos atuais, consulte `README.md` e `MIGRACAO_PRISMA.md`.


Este guia e uma cola pratica para a prova final sem internet. Ele foi escrito com base na estrutura real deste projeto (`backend-api-banco-de-doacoes`) e deve ser usado para criar uma rota nova do zero mantendo o mesmo padrao da API DoaI.

Use este documento junto com os arquivos ja existentes do projeto. A forma mais rapida e segura e copiar uma rota parecida e renomear com cuidado.

---

## 1. Visao geral da arquitetura

Fluxo padrao de uma requisicao:

```text
src/routes/*.js
  -> middlewares: AuthMiddleware, authorize/EnsureAdmin, validate, asyncWrapper
  -> src/controllers/*Controller.js
  -> src/services/*Service.js
  -> src/repositories/*Repository.js
  -> src/models/*.js
  -> MongoDB/Mongoose
```

Responsabilidade de cada camada:

| Camada | Responsabilidade |
| --- | --- |
| `routes` | Define metodo HTTP, URL, middlewares e controller chamado. |
| `controllers` | Le `req.params`, `req.query`, `req.body`, `req.user`; chama service; devolve `CommonResponse`. |
| `services` | Concentra regra de negocio, permissao de dono, status, unicidade, transicoes e erros esperados. |
| `repositories` | Encapsula Mongoose. Route e Service nao devem acessar model diretamente. |
| `models` | Define campos, enums, required, indexes e collection MongoDB. |
| `zod` | Valida body, query e params antes da regra de negocio. |
| `containers` | Instancia repositories e services e injeta dependencias. |
| `docs` | Swagger: paths e schemas. |
| `tests` | Testes unitarios de Service e testes HTTP de Route/Controller. |

Formato padrao de resposta:

```json
{
  "message": "Mensagem da operacao",
  "data": {},
  "errors": []
}
```

Helpers principais:

- `CommonResponse.success(res, data, code, message)`
- `CommonResponse.created(res, data, message)`
- `CommonResponse.error(res, code, errorType, field, errors, customMessage)`
- `CustomError({ statusCode, errorType, field, details, customMessage })`

---

## 2. Ordem recomendada para criar uma rota

Para uma rota completa, crie ou altere os arquivos nesta ordem:

```text
1. src/models/NomeModulo.js
2. src/repositories/filters/NomeModuloFilterBuilder.js        opcional, se tiver listagem com filtros
3. src/repositories/NomeModuloRepository.js
4. src/services/NomeModuloService.js
5. src/containers/repositories.all.container.js
6. src/containers/services.nomeModulo.container.js
7. src/containers/services.index.js
8. src/utils/validators/schemas/zod/NomeModuloSchema.js
9. src/utils/validators/schemas/zod/querys/NomeModuloQuerySchema.js
10. src/controllers/NomeModuloController.js
11. src/routes/nomeModuloRoutes.js
12. src/routes/index.js
13. src/docs/schemas/nomeModuloSchema.js
14. src/docs/paths/nomeModulo.js
15. src/docs/config/head.js
16. src/tests/services/NomeModuloService.spec.js
17. src/tests/routes/nomeModulo.spec.js
18. documentacao/rotas/rotas-nomeModulo.md
19. documentacao/doc-service/NomeModulo.md
```

Se a prova pedir uma rota simples de CRUD, use `Categoria` como principal referencia:

```text
src/routes/categoriaRoutes.js
src/controllers/CategoriaController.js
src/services/CategoriaService.js
src/repositories/CategoriaRepository.js
src/models/Categoria.js
src/utils/validators/schemas/zod/CategoriaSchema.js
src/tests/services/categoriaService.spec.js
src/tests/routes/categoria.spec.js
src/docs/paths/categoria.js
src/docs/schemas/categoriaSchema.js
documentacao/rotas/rotas-categoria.md
documentacao/doc-service/Categoria.md
```

Se a rota tiver transicao de status, dono do recurso ou concorrencia, use tambem:

```text
src/services/InteresseService.js
src/repositories/InteresseRepository.js
src/repositories/ItemDoacaoRepository.js
src/services/ItemDoacaoService.js
```

---

## 3. Convencoes de nomes

Exemplo com modulo `Favorito`:

| Tipo | Nome |
| --- | --- |
| Model | `Favorito.js` |
| Repository | `FavoritoRepository.js` |
| Service | `FavoritoService.js` |
| Controller | `FavoritoController.js` |
| Route | `favoritoRoutes.js` ou `favoritosRoutes.js` |
| Zod | `FavoritoSchema.js` |
| Query Zod | `FavoritoQuerySchema.js` |
| Swagger paths | `favorito.js` |
| Swagger schemas | `favoritoSchema.js` |
| Teste service | `FavoritoService.spec.js` |
| Teste route | `favorito.spec.js` |
| Endpoint | `/favoritos` |
| Collection MongoDB | `favoritos` |

Prefira URL no plural:

```text
GET    /favoritos
GET    /favoritos/:id
POST   /favoritos
PUT    /favoritos/:id
DELETE /favoritos/:id
```

---

## 4. Model Mongoose

Modelo base:

```js
import mongoose from "mongoose";
import mongoosePaginate from "mongoose-paginate-v2";

const schema = new mongoose.Schema(
  {
    usuario_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Usuario",
      required: true,
      index: true,
    },
    titulo: {
      type: String,
      required: true,
      trim: true,
    },
    descricao: {
      type: String,
      trim: true,
    },
    status: {
      type: String,
      enum: ["ATIVO", "INATIVO"],
      default: "ATIVO",
      index: true,
    },
  },
  {
    timestamps: {
      createdAt: "data_cadastro",
      updatedAt: "data_atualizacao",
    },
    versionKey: false,
  },
);

schema.index({ usuario_id: 1, status: 1 });
schema.plugin(mongoosePaginate);

export default mongoose.model("Favorito", schema, "favoritos");
```

Checklist do model:

- Campos obrigatorios com `required: true`.
- Enums de status no model e no Zod.
- `ref` correto para relacionamentos.
- `index: true` nos campos usados em filtros.
- `timestamps` com `data_cadastro` e `data_atualizacao`.
- `versionKey: false`.
- `mongoosePaginate` se tiver listagem paginada.
- Nome da collection no terceiro parametro do `mongoose.model`.

---

## 5. Repository

Use repository para todo acesso ao banco. Nao acesse `Model` diretamente no Service.

```js
import BaseRepository from "./base/BaseRepository.js";
import FavoritoModel from "../models/Favorito.js";
import FavoritoFilterBuilder from "./filters/FavoritoFilterBuilder.js";

class FavoritoRepository extends BaseRepository {
  constructor() {
    super(FavoritoModel);
  }

  buscarPorUsuarioEItem(usuarioId, itemId) {
    return this.model.findOne({ usuario_id: usuarioId, item_id: itemId });
  }

  listar({ filtros = {}, page = 1, limit = 10 } = {}) {
    const builder = new FavoritoFilterBuilder()
      .comUsuario(filtros.usuario_id)
      .comStatus(filtros.status);

    return this.listarComPaginacao(builder.build(), {
      page,
      limit,
      sort: { data_cadastro: -1 },
      populate: [
        { path: "usuario_id", select: "nome email" },
      ],
    });
  }

  atualizarSeStatus(id, statusEsperado, dadosAtualizacao) {
    return this.model.findOneAndUpdate(
      { _id: id, status: statusEsperado },
      { $set: dadosAtualizacao },
      { new: true, runValidators: true },
    );
  }
}

export default FavoritoRepository;
```

FilterBuilder opcional:

```js
class FavoritoFilterBuilder {
  constructor() {
    this.query = {};
  }

  comUsuario(usuarioId) {
    if (usuarioId) this.query.usuario_id = usuarioId;
    return this;
  }

  comStatus(status) {
    if (status) this.query.status = status;
    return this;
  }

  build() {
    return this.query;
  }
}

export default FavoritoFilterBuilder;
```

Checklist do repository:

- Extender `BaseRepository`.
- Usar `listarComPaginacao` para listagens.
- Usar `select` e `populate` com campos explicitos.
- Usar `findOneAndUpdate` condicional para transicoes de status.
- Usar `runValidators: true` em updates importantes.
- Nunca deixar Service montar query Mongoose grande.

---

## 6. Service

O Service e a camada mais importante. Coloque regra de negocio aqui.

```js
import { CustomError } from "../utils/helpers/index.js";

class FavoritoService {
  constructor({ favoritoRepository, itemDoacaoRepository }) {
    this.repository = favoritoRepository;
    this.itemDoacaoRepository = itemDoacaoRepository;
  }

  async criar(dados, usuarioAutenticado) {
    if (!usuarioAutenticado?.id) {
      throw new CustomError({
        statusCode: 401,
        customMessage: "Usuario autenticado nao informado.",
      });
    }

    if (usuarioAutenticado.situacao && usuarioAutenticado.situacao !== "ATIVO") {
      throw new CustomError({
        statusCode: 403,
        customMessage: "Somente usuarios ativos podem realizar esta operacao.",
      });
    }

    const item = await this.itemDoacaoRepository.buscarPorId(dados.item_id);
    if (!item) {
      throw new CustomError({
        statusCode: 404,
        customMessage: "Item nao encontrado.",
      });
    }

    const jaExiste = await this.repository.buscarPorUsuarioEItem(
      usuarioAutenticado.id,
      dados.item_id,
    );

    if (jaExiste) {
      throw new CustomError({
        statusCode: 409,
        customMessage: "Favorito ja cadastrado para este item.",
      });
    }

    return this.repository.criar({
      ...dados,
      usuario_id: usuarioAutenticado.id,
      status: "ATIVO",
    });
  }

  async listar({ filtros = {}, page = 1, limit = 10 }, usuarioAutenticado) {
    return this.repository.listar({
      filtros: {
        ...filtros,
        usuario_id: usuarioAutenticado.id,
      },
      page,
      limit,
    });
  }

  async buscarPorId(id, usuarioAutenticado) {
    const registro = await this.repository.buscarPorId(id);

    if (!registro) {
      throw new CustomError({
        statusCode: 404,
        customMessage: "Registro nao encontrado.",
      });
    }

    if (registro.usuario_id.toString() !== usuarioAutenticado.id) {
      throw new CustomError({
        statusCode: 403,
        customMessage: "Voce nao tem permissao para acessar este registro.",
      });
    }

    return registro;
  }

  async deletar(id, usuarioAutenticado) {
    await this.buscarPorId(id, usuarioAutenticado);
    return this.repository.deletar(id);
  }
}

export default FavoritoService;
```

Checklist do Service:

- Receber dependencias pelo construtor.
- Verificar existencia do recurso antes de atualizar/deletar.
- Verificar dono do recurso quando a regra exigir.
- Verificar perfil quando a regra nao estiver toda no middleware.
- Lancar `CustomError` com status correto: `400`, `401`, `403`, `404`, `409`.
- Nunca retornar senha, token, campos internos ou documento completo sem necessidade.
- Nao acessar `req`, `res` ou Express dentro do Service.
- Nao acessar Mongoose Model diretamente.

---

## 7. Containers

Registre o repository em `src/containers/repositories.all.container.js`:

```js
import FavoritoRepository from "../repositories/FavoritoRepository.js";

export const favoritoRepository = new FavoritoRepository();
```

Crie `src/containers/services.favorito.container.js`:

```js
import FavoritoService from "../services/FavoritoService.js";
import {
  favoritoRepository,
  itemDoacaoRepository,
} from "./repositories.all.container.js";

export const favoritoService = new FavoritoService({
  favoritoRepository,
  itemDoacaoRepository,
});
```

Exporte no `src/containers/services.index.js`:

```js
export { favoritoService } from "./services.favorito.container.js";
```

Checklist:

- Controller importa service do `services.index.js` ou de um container especifico ja usado pelo modulo.
- Nao instanciar repository dentro do Service.
- Nao instanciar Service dentro do Controller.

---

## 8. Zod schemas

Arquivo `src/utils/validators/schemas/zod/FavoritoSchema.js`:

```js
import { z } from "zod";
import { ObjectIdSchema } from "./ObjectIdSchema.js";

export const FavoritoSchema = z.object({
  item_id: ObjectIdSchema,
  observacao: z.string().trim().max(500).optional(),
});

export const FavoritoUpdateSchema = z.object({
  observacao: z.string().trim().max(500).optional(),
  status: z.enum(["ATIVO", "INATIVO"]).optional(),
}).strict();

export const FavoritoParamsSchema = z.object({
  id: ObjectIdSchema,
});
```

Arquivo `src/utils/validators/schemas/zod/querys/FavoritoQuerySchema.js`:

```js
import { z } from "zod";

export const favoritoQuerySchema = z.object({
  status: z.enum(["ATIVO", "INATIVO"]).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
}).strict();
```

Uso na rota:

```js
import { validate } from "../middlewares/validateMiddleware.js";
import {
  FavoritoSchema,
  FavoritoUpdateSchema,
  FavoritoParamsSchema,
} from "../utils/validators/schemas/zod/FavoritoSchema.js";
import { favoritoQuerySchema } from "../utils/validators/schemas/zod/querys/FavoritoQuerySchema.js";

router.get("/favoritos", validate(favoritoQuerySchema, "query"), controller.listar);
router.post("/favoritos", validate(FavoritoSchema, "body"), controller.criar);
router.put("/favoritos/:id", validate(FavoritoParamsSchema, "params"), validate(FavoritoUpdateSchema, "body"), controller.atualizar);
```

Checklist do Zod:

- `body`: validar campos enviados pelo cliente.
- `query`: converter `page` e `limit` de string para number.
- `params`: validar ObjectId.
- Usar `.strict()` quando campos extras nao devem ser aceitos.
- Usar `.partial()` ou schema separado em update.
- Nao deixar o cliente enviar campos controlados pelo sistema: `usuario_id`, `status` inicial, datas, contadores, IDs de auditoria.

---

## 9. Controller

Modelo baseado no padrao atual:

```js
import { favoritoService } from "../containers/services.index.js";
import CommonResponse from "../utils/helpers/CommonResponse.js";

class FavoritoController {
  listar = async (req, res, next) => {
    try {
      const { page, limit, ...filtros } = req.query;
      const data = await favoritoService.listar({ filtros, page, limit }, req.user);
      return CommonResponse.success(res, data);
    } catch (error) {
      return next(error);
    }
  };

  buscarPorId = async (req, res, next) => {
    try {
      const data = await favoritoService.buscarPorId(req.params.id, req.user);
      return CommonResponse.success(res, data);
    } catch (error) {
      return next(error);
    }
  };

  criar = async (req, res, next) => {
    try {
      const data = await favoritoService.criar(req.body, req.user);
      return CommonResponse.created(res, data, "Registro criado com sucesso.");
    } catch (error) {
      return next(error);
    }
  };

  deletar = async (req, res, next) => {
    try {
      await favoritoService.deletar(req.params.id, req.user);
      return CommonResponse.success(res, null, 204);
    } catch (error) {
      return next(error);
    }
  };
}

export default new FavoritoController();
```

Checklist do Controller:

- Nao colocar regra de negocio pesada.
- Nao acessar Model.
- Nao montar query Mongo.
- Usar `req.user` para usuario autenticado.
- Usar `CommonResponse`.
- Encaminhar erro para `next(error)` ou tratar como os controllers existentes.

---

## 10. Routes

Arquivo `src/routes/favoritoRoutes.js`:

```js
import express from "express";
import FavoritoController from "../controllers/FavoritoController.js";
import AuthMiddleware from "../middlewares/AuthMiddleware.js";
import EnsureActiveUserMiddleware from "../middlewares/EnsureActiveUserMiddleware.js";
import asyncWrapper from "../middlewares/asyncWrapper.js";
import { validate } from "../middlewares/validateMiddleware.js";
import {
  FavoritoSchema,
  FavoritoParamsSchema,
} from "../utils/validators/schemas/zod/FavoritoSchema.js";
import { favoritoQuerySchema } from "../utils/validators/schemas/zod/querys/FavoritoQuerySchema.js";

const router = express.Router();

router
  .get(
    "/favoritos",
    AuthMiddleware,
    EnsureActiveUserMiddleware,
    validate(favoritoQuerySchema, "query"),
    asyncWrapper(FavoritoController.listar),
  )
  .get(
    "/favoritos/:id",
    AuthMiddleware,
    EnsureActiveUserMiddleware,
    validate(FavoritoParamsSchema, "params"),
    asyncWrapper(FavoritoController.buscarPorId),
  )
  .post(
    "/favoritos",
    AuthMiddleware,
    EnsureActiveUserMiddleware,
    validate(FavoritoSchema, "body"),
    asyncWrapper(FavoritoController.criar),
  )
  .delete(
    "/favoritos/:id",
    AuthMiddleware,
    EnsureActiveUserMiddleware,
    validate(FavoritoParamsSchema, "params"),
    asyncWrapper(FavoritoController.deletar),
  );

export default router;
```

Registre em `src/routes/index.js`:

```js
import favorito from "./favoritoRoutes.js";

// dentro de routes(app):
app.use(favorito);
```

Rotas administrativas:

```js
import EnsureAdminMiddleware from "../middlewares/EnsureAdminMiddleware.js";

router.post(
  "/admin/favoritos",
  AuthMiddleware,
  EnsureActiveUserMiddleware,
  EnsureAdminMiddleware,
  asyncWrapper(FavoritoController.criarComoAdmin),
);
```

Checklist das routes:

- Rota publica: sem `AuthMiddleware`.
- Rota logada: `AuthMiddleware`.
- Rota logada que exige usuario ativo: `AuthMiddleware`, depois `EnsureActiveUserMiddleware`.
- Rota admin: `AuthMiddleware`, `EnsureActiveUserMiddleware`, `EnsureAdminMiddleware` ou `authorize("ADMINISTRADOR")`.
- Validacao Zod antes do controller.
- `asyncWrapper` no ultimo handler.

---

## 11. Swagger

Crie `src/docs/schemas/favoritoSchema.js`:

```js
const paginatedSchema = (schemaRef) => ({
  type: "object",
  properties: {
    docs: {
      type: "array",
      items: { $ref: schemaRef },
    },
    totalDocs: { type: "integer", example: 1 },
    limit: { type: "integer", example: 10 },
    totalPages: { type: "integer", example: 1 },
    page: { type: "integer", example: 1 },
  },
});

const favoritoSchemas = {
  FavoritoResponse: {
    type: "object",
    properties: {
      _id: { type: "string", example: "507f1f77bcf86cd799439030" },
      usuario_id: { type: "string", example: "507f1f77bcf86cd799439012" },
      item_id: { type: "string", example: "507f1f77bcf86cd799439015" },
      observacao: { type: "string", example: "Tenho interesse neste item." },
      status: { type: "string", enum: ["ATIVO", "INATIVO"], example: "ATIVO" },
      data_cadastro: { type: "string", format: "date-time" },
      data_atualizacao: { type: "string", format: "date-time" },
    },
  },
  FavoritoPost: {
    type: "object",
    required: ["item_id"],
    properties: {
      item_id: { type: "string", example: "507f1f77bcf86cd799439015" },
      observacao: { type: "string", maxLength: 500 },
    },
  },
  FavoritoPaginado: paginatedSchema("#/components/schemas/FavoritoResponse"),
};

export default favoritoSchemas;
```

Crie `src/docs/paths/favorito.js`:

```js
import commonResponses from "../schemas/swaggerCommonResponses.js";

const favoritoPaths = {
  "/favoritos": {
    get: {
      tags: ["Favoritos"],
      summary: "Listar favoritos do usuario autenticado",
      description: `Lista favoritos do usuario autenticado.

Regras de negocio:
- Exige autenticacao via Bearer Token.
- Somente usuarios ativos podem listar favoritos.
- O usuario so visualiza os proprios registros.`,
      security: [{ bearerAuth: [] }],
      parameters: [
        { name: "page", in: "query", schema: { type: "integer", default: 1 } },
        { name: "limit", in: "query", schema: { type: "integer", default: 10 } },
      ],
      responses: {
        200: commonResponses[200]("#/components/schemas/FavoritoPaginado"),
        400: commonResponses[400](),
        401: commonResponses[401](),
        403: commonResponses[403](),
        498: commonResponses[498](),
        500: commonResponses[500](),
      },
    },
    post: {
      tags: ["Favoritos"],
      summary: "Criar favorito",
      description: `Cria um favorito para o usuario autenticado.

Regras de negocio:
- Exige autenticacao via Bearer Token.
- O item informado deve existir.
- Nao pode haver favorito duplicado para o mesmo usuario e item.`,
      security: [{ bearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/FavoritoPost" },
          },
        },
      },
      responses: {
        201: commonResponses[201]("#/components/schemas/FavoritoResponse"),
        400: commonResponses[400](),
        403: commonResponses[403](),
        404: commonResponses[404](),
        409: commonResponses[409](),
        498: commonResponses[498](),
        500: commonResponses[500](),
      },
    },
  },
};

export default favoritoPaths;
```

Registre em `src/docs/config/head.js`:

```js
import favoritoPaths from "../paths/favorito.js";
import favoritoSchemas from "../schemas/favoritoSchema.js";

// tags:
{
  name: "Favoritos",
  description: "Rotas de favoritos de itens de doacao.",
}

// paths:
...favoritoPaths,

// components.schemas:
...favoritoSchemas,
```

Observacao importante para prova offline:

- O endpoint `GET /docs.json` funciona offline porque retorna JSON gerado pela API.
- A tela `GET /docs` usa arquivos CSS/JS de CDN externa (`unpkg`). Sem internet, a pagina pode nao renderizar se esses assets nao estiverem em cache. Se isso acontecer, use `/docs.json` ou teste por `curl`/Postman local.

---

## 12. Documentacao Markdown da rota

Crie `documentacao/rotas/rotas-favorito.md`:

````md
# Rotas de Favoritos

## Regras de negocio

- Usuario autenticado pode criar favorito para item existente.
- Usuario so pode listar, consultar e remover os proprios favoritos.
- Nao e permitido cadastrar favorito duplicado para o mesmo item.
- Usuarios inativos ou suspensos nao podem operar a rota.

## Endpoints

| Metodo | Rota | Auth | Descricao |
| --- | --- | --- | --- |
| GET | /favoritos | USUARIO | Lista favoritos do usuario autenticado |
| GET | /favoritos/:id | USUARIO | Consulta favorito por ID |
| POST | /favoritos | USUARIO | Cria favorito |
| DELETE | /favoritos/:id | USUARIO | Remove favorito |

## POST /favoritos

### Body

```json
{
  "item_id": "507f1f77bcf86cd799439015",
  "observacao": "Tenho interesse neste item."
}
```

### Respostas

- 201: favorito criado
- 400: payload invalido
- 403: usuario sem permissao ou inativo
- 404: item nao encontrado
- 409: favorito duplicado
- 498: token ausente/invalido
````

Crie `documentacao/doc-service/Favorito.md`:

````md
# Plano de Teste - FavoritoService

## Objetivo

Validar as regras de negocio do FavoritoService com repositories mockados.

## Metodos testados

| Metodo | Regra |
| --- | --- |
| criar | Cria favorito para item existente e bloqueia duplicidade |
| listar | Lista somente favoritos do usuario autenticado |
| buscarPorId | Bloqueia acesso a favorito de outro usuario |
| deletar | Remove favorito existente do proprio usuario |

## Cenarios principais

| ID | Cenario | Resultado esperado |
| --- | --- | --- |
| SV-FAV-01 | Criar favorito com item existente | 201/sucesso |
| SV-FAV-02 | Criar favorito duplicado | CustomError 409 |
| SV-FAV-03 | Criar favorito com item inexistente | CustomError 404 |
| SV-FAV-04 | Buscar favorito de outro usuario | CustomError 403 |
````

---

## 13. Teste unitario de Service

Arquivo `src/tests/services/FavoritoService.spec.js`:

```js
import { beforeEach, describe, expect, jest, test } from "@jest/globals";
import FavoritoService from "../../services/FavoritoService.js";

const mockFavoritoRepository = {
  buscarPorUsuarioEItem: jest.fn(),
  buscarPorId: jest.fn(),
  criar: jest.fn(),
  deletar: jest.fn(),
  listar: jest.fn(),
};

const mockItemDoacaoRepository = {
  buscarPorId: jest.fn(),
};

let service;

const usuario = {
  id: "507f1f77bcf86cd799439012",
  perfil: "USUARIO",
  situacao: "ATIVO",
};

beforeEach(() => {
  Object.values(mockFavoritoRepository).forEach((fn) => fn.mockReset());
  Object.values(mockItemDoacaoRepository).forEach((fn) => fn.mockReset());

  service = new FavoritoService({
    favoritoRepository: mockFavoritoRepository,
    itemDoacaoRepository: mockItemDoacaoRepository,
  });
});

describe("FavoritoService.criar", () => {
  test("SV-FAV-01 - cria favorito quando item existe e nao ha duplicidade", async () => {
    mockItemDoacaoRepository.buscarPorId.mockResolvedValue({
      _id: "507f1f77bcf86cd799439015",
    });
    mockFavoritoRepository.buscarPorUsuarioEItem.mockResolvedValue(null);
    mockFavoritoRepository.criar.mockResolvedValue({
      _id: "507f1f77bcf86cd799439030",
      item_id: "507f1f77bcf86cd799439015",
    });

    const resultado = await service.criar(
      { item_id: "507f1f77bcf86cd799439015" },
      usuario,
    );

    expect(resultado.item_id).toBe("507f1f77bcf86cd799439015");
    expect(mockFavoritoRepository.criar).toHaveBeenCalledWith(
      expect.objectContaining({
        usuario_id: usuario.id,
        status: "ATIVO",
      }),
    );
  });

  test("SV-FAV-02 - lanca 409 quando favorito ja existe", async () => {
    mockItemDoacaoRepository.buscarPorId.mockResolvedValue({
      _id: "507f1f77bcf86cd799439015",
    });
    mockFavoritoRepository.buscarPorUsuarioEItem.mockResolvedValue({
      _id: "507f1f77bcf86cd799439030",
    });

    await expect(
      service.criar({ item_id: "507f1f77bcf86cd799439015" }, usuario),
    ).rejects.toMatchObject({ statusCode: 409 });

    expect(mockFavoritoRepository.criar).not.toHaveBeenCalled();
  });
});
```

O que o teste unitario deve provar:

- Regra de negocio principal.
- Erros esperados do Service.
- Repository chamado com os dados certos.
- Repository nao chamado quando a regra bloqueia.
- Sem Express, sem Supertest, sem banco real.

---

## 14. Teste de route/endpoint

Arquivo `src/tests/routes/favorito.spec.js`:

```js
import express from "express";
import jwt from "jsonwebtoken";
import request from "supertest";
import { beforeAll, beforeEach, describe, expect, jest, test } from "@jest/globals";
import CustomError from "../../utils/helpers/CustomError.js";
import errorHandler from "../../utils/helpers/errorHandler.js";
import { createRegularUser, testIds } from "../test.js";

const mockFavoritoService = {
  listar: jest.fn(),
  buscarPorId: jest.fn(),
  criar: jest.fn(),
  deletar: jest.fn(),
};

const mockUsuarioRepository = {
  buscarPorId: jest.fn(),
};

jest.mock("../../containers/services.index.js", () => ({
  favoritoService: mockFavoritoService,
}));

jest.mock("../../repositories/UsuarioRepository.js", () => {
  return jest.fn().mockImplementation(() => mockUsuarioRepository);
});

let app;

const bearer = (user) =>
  `Bearer ${jwt.sign(user, process.env.JWT_SECRET_ACCESS_TOKEN)}`;

const usuarioAtivo = () =>
  createRegularUser({
    id: testIds.usuario,
    situacao: "ATIVO",
  });

beforeAll(async () => {
  const { default: favoritoRoutes } = await import("../../routes/favoritoRoutes.js");
  app = express();
  app.use(express.json());
  app.use(favoritoRoutes);
  app.use(errorHandler);
});

beforeEach(() => {
  Object.values(mockFavoritoService).forEach((fn) => fn.mockReset());
  Object.values(mockUsuarioRepository).forEach((fn) => fn.mockReset());

  mockUsuarioRepository.buscarPorId.mockResolvedValue({
    _id: testIds.usuario,
    nome: "Usuario Teste",
    email: "usuario@email.com",
    perfil: "USUARIO",
    situacao: "ATIVO",
  });
});

describe("Rotas de Favorito", () => {
  test("GET /favoritos retorna 498 sem token", async () => {
    const res = await request(app).get("/favoritos");

    expect(res.statusCode).toBe(498);
    expect(mockFavoritoService.listar).not.toHaveBeenCalled();
  });

  test("GET /favoritos retorna 200 com token valido", async () => {
    mockFavoritoService.listar.mockResolvedValue({
      docs: [],
      totalDocs: 0,
      page: 1,
    });

    const res = await request(app)
      .get("/favoritos")
      .set("Authorization", bearer(usuarioAtivo()));

    expect(res.statusCode).toBe(200);
    expect(res.body.data.docs).toEqual([]);
  });

  test("POST /favoritos retorna 201 ao criar", async () => {
    mockFavoritoService.criar.mockResolvedValue({
      _id: "507f1f77bcf86cd799439030",
      item_id: testIds.item,
    });

    const res = await request(app)
      .post("/favoritos")
      .set("Authorization", bearer(usuarioAtivo()))
      .send({ item_id: testIds.item });

    expect(res.statusCode).toBe(201);
    expect(res.body.data.item_id).toBe(testIds.item);
  });

  test("POST /favoritos retorna 409 em duplicidade", async () => {
    mockFavoritoService.criar.mockRejectedValue(
      new CustomError({
        statusCode: 409,
        customMessage: "Favorito ja cadastrado para este item.",
      }),
    );

    const res = await request(app)
      .post("/favoritos")
      .set("Authorization", bearer(usuarioAtivo()))
      .send({ item_id: testIds.item });

    expect(res.statusCode).toBe(409);
  });
});
```

O que o teste de route deve provar:

- URL e metodo HTTP corretos.
- Middleware de autenticacao funcionando.
- Middleware de usuario ativo/admin quando existir.
- Validacao Zod rejeitando payload invalido.
- Controller chamando Service.
- Resposta HTTP com status e shape corretos.
- Erros do Service virando HTTP esperado.

---

## 15. Comandos de teste

Linux:

```bash
npm test -- --runInBand src/tests/services/FavoritoService.spec.js
npm test -- --runInBand src/tests/routes/favorito.spec.js
npm test -- --runInBand
npm run test:coverage -- --runInBand
```

Windows PowerShell:

```powershell
npm.cmd test -- --runInBand src/tests/services/FavoritoService.spec.js
npm.cmd test -- --runInBand src/tests/routes/favorito.spec.js
npm.cmd test -- --runInBand
npm.cmd run test:coverage -- --runInBand
```

Observacoes:

- Os testes nao precisam de MongoDB local quando executados pelos scripts do projeto.
- Os scripts ja usam `NODE_ENV=test` e `USE_IN_MEMORY_DB=true`.
- Teste de Service usa mock de repository.
- Teste de Route usa Supertest, router real, middlewares reais e Service mockado.

---

## 16. Rodar local com Node e MongoDB via Docker

Este modo e util se o Node/npm ja estiver instalado no Linux e voce quiser usar Docker so para o banco.

Subir MongoDB:

```bash
docker run -d \
  --name doai-mongo \
  -p 27017:27017 \
  -v doai-mongo-data:/data/db \
  mongo:8
```

Criar `.env` local sem commitar:

```bash
cp ".env EXAMPLE" .env
```

Configure o `.env` local para usar o Mongo do host:

```env
APP_PORT=7340
NODE_ENV=development
USE_IN_MEMORY_DB=false
DB_URL=mongodb://127.0.0.1:27017/doai
JWT_SECRET_ACCESS_TOKEN=troque-por-um-segredo-local
JWT_SECRET=troque-por-um-segredo-local
JWT_SECRET_PASSWORD_RECOVERY=troque-por-um-segredo-local
```

Instalar e rodar:

```bash
npm install
npm run seed
npm run dev
```

Acessos:

```text
API:     http://localhost:7340
Swagger: http://localhost:7340/docs
JSON:    http://localhost:7340/docs.json
```

Parar banco:

```bash
docker stop doai-mongo
docker rm doai-mongo
```

Apagar dados do banco, se precisar recomecar:

```bash
docker volume rm doai-mongo-data
```

---

## 17. Rodar API e banco com docker compose

Este modo usa `docker-compose.yml` do projeto.

### 17.1 Preparacao antes de ficar offline

Sem internet, Docker so funciona se as imagens e dependencias ja estiverem no cache local. Antes da prova, com internet, rode:

```bash
docker pull mongo:8
docker compose build
docker image ls
```

Se a prova for em outra maquina Linux, salve as imagens:

```bash
docker save mongo:8 backend-api-banco-de-doacoes-minha-api -o doai-offline-images.tar
```

Na maquina da prova:

```bash
docker load -i doai-offline-images.tar
```

Se a imagem da API tiver outro nome, veja com:

```bash
docker image ls
```

### 17.2 Alerta sobre o Dockerfile atual

O `Dockerfile` atual possui:

```dockerfile
RUN cp .env.example .env
```

Mas o arquivo versionado do projeto se chama:

```text
.env EXAMPLE
```

Se o build falhar com erro de `.env.example` nao encontrado, crie uma copia local antes do build:

```bash
cp ".env EXAMPLE" .env.example
```

Nao commite `.env` nem arquivos com segredo real. Para uma correcao definitiva no projeto, o ideal seria ajustar o `Dockerfile`, mas em prova offline o workaround acima e o caminho mais rapido.

### 17.3 Configurar `.env` para compose

Crie o `.env` local:

```bash
cp ".env EXAMPLE" .env
```

No compose, a API roda dentro da rede Docker. Portanto o `DB_URL` deve apontar para o nome do servico Mongo:

```env
APP_PORT=7340
NODE_ENV=development
USE_IN_MEMORY_DB=false
DB_URL=mongodb://meu-mongodb:27017/doai
JWT_SECRET_ACCESS_TOKEN=troque-por-um-segredo-local
JWT_SECRET=troque-por-um-segredo-local
JWT_SECRET_PASSWORD_RECOVERY=troque-por-um-segredo-local
```

Se o Mongo for configurado com usuario e senha, use `authSource=admin`:

```env
DB_URL=mongodb://usuario:senha@meu-mongodb:27017/doai?authSource=admin
```

### 17.4 Subir containers

```bash
docker compose up -d --build
docker compose ps
docker compose logs -f minha-api
```

Pelo `docker-compose.yml` atual, a API fica exposta na porta 80 do host:

```text
http://localhost
http://localhost/docs
http://localhost/docs.json
```

Se a porta 80 estiver ocupada, altere temporariamente o mapeamento do compose para:

```yaml
ports:
  - 7340:7340
```

Depois acesse:

```text
http://localhost:7340
```

Rodar seed dentro do container:

```bash
docker compose exec minha-api npm run seed
```

Parar:

```bash
docker compose down
```

Parar e apagar volume do banco:

```bash
docker compose down -v
```

---

## 18. Checklist de validacao antes de dizer que terminou

Rode:

```bash
git status --short
npm test -- --runInBand src/tests/services/NomeModuloService.spec.js
npm test -- --runInBand src/tests/routes/nomeModulo.spec.js
npm test -- --runInBand
npm run test:coverage -- --runInBand
```

Se alterou Swagger:

```bash
npm run dev
curl http://localhost:7340/docs.json
```

Se alterou Docker:

```bash
docker compose build
docker compose up -d
docker compose ps
docker compose logs --tail=100 minha-api
```

Teste manual rapido com `curl`:

```bash
curl -X GET http://localhost:7340/favoritos \
  -H "Authorization: Bearer SEU_TOKEN"
```

---

## 19. Erros comuns e como resolver

### `Token nao informado` ou status 498

Faltou header:

```text
Authorization: Bearer <token>
```

### Status 403

Possiveis causas:

- Usuario nao e `ADMINISTRADOR`.
- Usuario esta `SUSPENSO` ou `INATIVO`.
- Usuario nao e dono do recurso.

### Status 400 em payload valido

Verifique:

- Schema Zod.
- Nome dos campos no body.
- Se `page` e `limit` estao sendo convertidos no query schema.
- Se campos extras estao sendo rejeitados por `.strict()`.

### Status 404 mesmo com ID

Verifique:

- ID e ObjectId valido.
- Registro existe no banco usado pela API.
- `DB_URL` aponta para o banco correto.
- Seed foi executado no mesmo banco.

### Docker build falha em `.env.example`

Criar copia local:

```bash
cp ".env EXAMPLE" .env.example
```

### API sobe, mas nao conecta no Mongo pelo compose

Dentro do compose, nao use `127.0.0.1` para o Mongo. Use o nome do servico:

```env
DB_URL=mongodb://meu-mongodb:27017/doai
```

### Swagger `/docs` nao abre offline

Use:

```text
http://localhost:7340/docs.json
```

A tela HTML do Swagger usa assets externos de CDN. O JSON da especificacao continua sendo gerado localmente.

---

## 20. Checklist final de uma rota completa

Use esta lista antes de entregar:

- [ ] Model criado com campos, enums, timestamps, collection e indexes.
- [ ] Repository criado e sem regra de negocio pesada.
- [ ] FilterBuilder criado se houver filtros.
- [ ] Service criado com regras de negocio, permissao, dono e erros.
- [ ] Container de repository registrado.
- [ ] Container de service criado.
- [ ] Service exportado no `services.index.js`.
- [ ] Zod de body criado.
- [ ] Zod de query criado, se houver listagem.
- [ ] Zod de params/ObjectId aplicado.
- [ ] Controller usa `CommonResponse`.
- [ ] Route usa middlewares corretos.
- [ ] Route registrada em `src/routes/index.js`.
- [ ] Swagger path criado.
- [ ] Swagger schema criado.
- [ ] Swagger registrado em `src/docs/config/head.js`.
- [ ] Markdown da rota criado em `documentacao/rotas/`.
- [ ] Plano do service criado em `documentacao/doc-service/`.
- [ ] Teste unitario de Service criado.
- [ ] Teste de Route/Endpoint criado.
- [ ] Testes focados passam.
- [ ] Suite completa passa.
- [ ] Coverage executa.
- [ ] `git status --short` revisado.

---

## 21. Estrategia rapida para a prova

Se o professor pedir uma rota nova, siga esta ordem:

1. Entenda o recurso, campos, quem pode acessar e regras de negocio.
2. Copie `Categoria` se for CRUD simples.
3. Copie `Interesse` ou `ItemDoacao` se tiver status, dono, aceite, cancelamento ou fluxo.
4. Renomeie arquivos, classes, imports, endpoints e collection.
5. Registre container e `routes/index.js`.
6. Crie Zod antes de testar manualmente.
7. Teste Service primeiro.
8. Teste Route depois.
9. Registre Swagger e Markdown por ultimo.
10. Rode testes focados e depois suite completa.

Regra principal: se a regra envolve negocio, ela vai para o Service. Se envolve banco, vai para o Repository. Se envolve HTTP, vai para Route/Controller. Se envolve formato de entrada, vai para Zod.
