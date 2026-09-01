# Plano de Teste — Rotas de Categoria
---

## 1. Apresentacao

Este plano documenta os testes de contrato HTTP das rotas de categoria da API REST DoaI. Os testes validam status HTTP, payload, sessão Better Auth e autorização por perfil, com o `CategoriaService` isolado.

A suite importa o arquivo de rotas real (`categoriaRoutes.js`) e exercita a cadeia completa de middlewares (`AuthMiddleware`, `authorize`) antes de chegar ao controller, garantindo que o arquivo de rotas seja efetivamente coberto pelos testes.

---

## 2. Objetivo

Validar que as rotas de categoria respondem corretamente a cada cenario, cobrindo:

- Status HTTP corretos para cada operacao — 200, 201, 204, 403, 404, 409, 498
- Payload de resposta conforme o contrato da API
- Rotas publicas de leitura (listar e buscar por ID) sem exigencia de token
- Rotas administrativas (criar, atualizar, deletar) exigindo token e perfil ADMINISTRADOR
- Validacao de unicidade de nome propagada do service (409)
- Propagacao correta dos erros do service para o cliente

---

## 3. Escopo

### 3.1 Endpoints Testados

| Metodo   | Rota               | Autenticacao  | RF/RN  |
| -------- | ------------------ | ------------- | ------ |
| `GET`    | `/categorias`      | Publico       | RF-003 |
| `GET`    | `/categorias/:id`  | Publico       | RF-003 |
| `POST`   | `/categorias`      | ADMINISTRADOR | RF-003 |
| `PUT`    | `/categorias/:id`  | ADMINISTRADOR | RF-003 |
| `DELETE` | `/categorias/:id`  | ADMINISTRADOR | RF-003 |

### 3.2 Fora do Escopo

- Testes de regras de negocio (cobertos em `services/categoriaService.spec.js`)
- Testes de repository (utilizam banco real / banco em memoria, sem mock)
- Testes E2E com frontend

---

## 4. Estrategia

**Abordagem:** testes de contrato HTTP — o `CategoriaService` e completamente mockado via `jest.mock()`. As requisicoes HTTP sao feitas com `supertest` contra um app Express que monta o roteador real de categoria (`categoriaRoutes.js`), de modo que a cadeia de middlewares e o proprio arquivo de rotas sejam exercitados e contabilizados na cobertura.

### 4.1 Autenticação por sessão

As rotas administrativas exigem sessão válida e perfil `ADMINISTRADOR`. Os testes de route usam identidade Bearer controlada; o Better Auth real é coberto pela suíte própria de autenticação.

| Helper          | Perfil Simulado                                  | Usado em                                   |
| --------------- | ------------------------------------------------ | ------------------------------------------ |
| `adminAuth()`   | `{ id: testIds.admin, perfil: "ADMINISTRADOR" }` | criar, atualizar, deletar (caminho feliz)  |
| `usuarioAuth()` | `{ id: testIds.usuario, perfil: "USUARIO" }`     | cenarios de bloqueio por perfil (403)      |

As rotas `GET /categorias` e `GET /categorias/:id` sao publicas e testadas sem token.

### 4.2 Arquivo de Teste

```
src/tests/routes/categoria.spec.js
```
---

## 5. Cenarios de Teste

### 5.1 GET /categorias — Listar (publico)

**RF-003**

| ID    | Descricao                                  | Payload / Query             | Mock Service                                  | Status HTTP | Validacao                | Status |
| ----- | ------------------------------------------ | --------------------------- | --------------------------------------------- | ----------- | ------------------------ | ------ |
| RC-01 | Listar categorias retorna 200 com paginacao | GET sem query               | `listar: { docs: [...], totalDocs: 1 }`       | `200`       | `data.docs` com 1 item   | PASSOU |
| RC-02 | Listar aceita filtros de query (nome, ativo) | `?nome=Roupas&ativo=true`   | `listar: { docs: [], totalDocs: 0 }`          | `200`       | resposta 200             | PASSOU |

---

### 5.2 GET /categorias/:id — Buscar por ID (publico)

**RF-003**

| ID    | Descricao                              | Payload / Query          | Mock Service                       | Status HTTP | Validacao               | Status |
| ----- | -------------------------------------- | ------------------------ | ---------------------------------- | ----------- | ----------------------- | ------ |
| RC-03 | ID valido retorna 200 com a categoria  | `GET /categorias/:id`    | `buscarPorId: { _id, nome }`       | `200`       | `data._id` correto      | PASSOU |
| RC-04 | Categoria inexistente retorna 404      | `GET /categorias/:id`    | `buscarPorId: CustomError 404`     | `404`       | mensagem nao encontrada | PASSOU |

---

### 5.3 POST /categorias — Criar (admin)

**RF-003**

| ID    | Descricao                                  | Payload / Auth                    | Mock Service                       | Status HTTP | Validacao                       | Status |
| ----- | ------------------------------------------ | --------------------------------- | ---------------------------------- | ----------- | ------------------------------- | ------ |
| RC-05 | Requisicao sem token retorna 498           | `{ nome }` sem Authorization       | nao chega ao service               | `498`       | bloqueado pelo AuthMiddleware   | PASSOU |
| RC-06 | Usuario comum retorna 403                  | `{ nome }` com token de usuario    | nao chega ao service               | `403`       | bloqueado pelo authorize        | PASSOU |
| RC-07 | Admin cria categoria retorna 201           | `{ nome, descricao }` token admin  | `criar: { _id, nome, ativo }`      | `201`       | `data.nome` correto             | PASSOU |
| RC-08 | Nome ja existente retorna 409              | `{ nome }` token admin             | `criar: CustomError 409`           | `409`       | mensagem nome ja existe         | PASSOU |

---

### 5.4 PUT /categorias/:id — Atualizar (admin)

**RF-003**

| ID    | Descricao                              | Payload / Auth                  | Mock Service                       | Status HTTP | Validacao                | Status |
| ----- | -------------------------------------- | ------------------------------- | ---------------------------------- | ----------- | ------------------------ | ------ |
| RC-09 | Usuario comum retorna 403              | `{ nome }` token de usuario      | nao chega ao service               | `403`       | bloqueado pelo authorize | PASSOU |
| RC-10 | Admin atualiza categoria retorna 200   | `{ nome }` token admin           | `atualizar: { _id, nome }`         | `200`       | `data.nome` atualizado   | PASSOU |
| RC-11 | Categoria inexistente retorna 404      | `{ nome }` token admin           | `atualizar: CustomError 404`       | `404`       | mensagem nao encontrada  | PASSOU |

---

### 5.5 DELETE /categorias/:id — Deletar (admin)

**RF-003**

| ID    | Descricao                              | Payload / Auth          | Mock Service                       | Status HTTP | Validacao                | Status |
| ----- | -------------------------------------- | ----------------------- | ---------------------------------- | ----------- | ------------------------ | ------ |
| RC-12 | Usuario comum retorna 403              | token de usuario         | nao chega ao service               | `403`       | bloqueado pelo authorize | PASSOU |
| RC-13 | Admin deleta categoria retorna 204     | token admin              | `deletar: { _id }`                 | `204`       | sem body na resposta     | PASSOU |
| RC-14 | Categoria inexistente retorna 404      | token admin              | `deletar: CustomError 404`         | `404`       | mensagem nao encontrada  | PASSOU |

---

## 6. Resultado de Execucao

| Suite          | Arquivo                    | Testes | Aprovados | Reprovados | Status |
| -------------- | -------------------------- | ------ | --------- | ---------- | ------ |
| Rotas Categoria | `routes/categoria.spec.js` | **14** | **14**    | **0**      | PASSOU |

---

## 7. Resumo dos Cenarios

| ID    | Rota                  | Descricao                          | Status HTTP | Status |
| ----- | --------------------- | ---------------------------------- | ----------- | ------ |
| RC-01 | GET /categorias       | Listagem paginada                  | 200         | PASSOU |
| RC-02 | GET /categorias       | Listagem com filtros               | 200         | PASSOU |
| RC-03 | GET /categorias/:id   | Busca por ID valido                | 200         | PASSOU |
| RC-04 | GET /categorias/:id   | Categoria inexistente              | 404         | PASSOU |
| RC-05 | POST /categorias      | Sem token retorna 498              | 498         | PASSOU |
| RC-06 | POST /categorias      | Usuario comum bloqueado            | 403         | PASSOU |
| RC-07 | POST /categorias      | Admin cria categoria               | 201         | PASSOU |
| RC-08 | POST /categorias      | Nome duplicado                     | 409         | PASSOU |
| RC-09 | PUT /categorias/:id   | Usuario comum bloqueado            | 403         | PASSOU |
| RC-10 | PUT /categorias/:id   | Admin atualiza categoria           | 200         | PASSOU |
| RC-11 | PUT /categorias/:id   | Categoria inexistente              | 404         | PASSOU |
| RC-12 | DELETE /categorias/:id | Usuario comum bloqueado           | 403         | PASSOU |
| RC-13 | DELETE /categorias/:id | Admin deleta categoria            | 204         | PASSOU |
| RC-14 | DELETE /categorias/:id | Categoria inexistente             | 404         | PASSOU |

---

## 8. Criterios de Aceitacao

- 100% dos testes de rotas de categoria aprovados (14/14)
- Status HTTP corretos para todos os cenarios
- Rotas publicas de leitura acessiveis sem token
- Rotas administrativas exigindo sessão válida (498 sem bearer)
- Autorizacao por perfil bloqueando usuario comum em rotas administrativas (403)
- Unicidade de nome propagada do service (409)
- Propagacao correta de erros do service para o cliente
- Arquivo `categoriaRoutes.js` coberto pelo relatorio de cobertura

---

## 9. Observacoes

- A suíte monta o roteador real (`categoriaRoutes.js`) e exercita autorização e controller com identidade controlada. O middleware de produção é validado separadamente.
- As rotas `GET /categorias` e `GET /categorias/:id` sao publicas; as demais exigem perfil ADMINISTRADOR.
- O `DELETE /categorias/:id` retorna `204` (sem corpo), conforme implementado no controller via `CommonResponse.success(res, null, 204)`.
- Cenarios de bloqueio por autenticacao (498) e autorizacao (403) garantem que operacoes administrativas nao sejam executadas por usuarios sem permissao.
