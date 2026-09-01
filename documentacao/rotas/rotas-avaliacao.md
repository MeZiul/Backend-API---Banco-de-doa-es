# Plano de Teste — Rotas de Avaliacao
---

## 1. Apresentacao

Este plano documenta os testes de contrato HTTP das rotas de avaliacao da API REST DoaI. Os testes validam status HTTP, payload, sessão Better Auth e controle de autoria, com o `AvaliacaoService` isolado.

A suite importa o arquivo de rotas real (`avaliacaoRotas.js`) e exercita a cadeia de middleware (`AuthMiddleware`) antes de chegar ao controller, garantindo que o arquivo de rotas seja efetivamente coberto pelos testes.

---

## 2. Objetivo

Validar que as rotas de avaliacao respondem corretamente a cada cenario, cobrindo:

- Status HTTP corretos para cada operacao — 200, 201, 204, 400, 403, 404, 498
- Payload de resposta conforme o contrato da API
- Exigência de sessão válida em todas as rotas do módulo
- Repasse correto dos parametros (dados, filtros, ator) do controller ao service
- Bloqueio de alteracao de campos sensiveis na atualizacao (item_id, avaliador_id, avaliado_id, tipo)
- Controle de autoria propagado do service (apenas o autor altera/remove)
- Propagacao correta dos erros do service para o cliente

---

## 3. Escopo

### 3.1 Endpoints Testados

| Metodo   | Rota               | Autenticacao | RF/RN  |
| -------- | ------------------ | ------------ | ------ |
| `POST`   | `/avaliacoes`      | Token        | RF-017 |
| `GET`    | `/avaliacoes`      | Token        | RF-017 |
| `GET`    | `/avaliacoes/:id`  | Token        | RF-017 |
| `PUT`    | `/avaliacoes/:id`  | Token (autor) | RF-017 |
| `DELETE` | `/avaliacoes/:id`  | Token (autor) | RF-017 |

### 3.2 Fora do Escopo

- Testes de regras de negocio (cobertos em `services/avaliacaoService.spec.js`)
- Testes de repository (utilizam banco real / banco em memoria, sem mock)
- Recalculo de media e total de avaliacoes (regra de negocio do service)
- Testes E2E com frontend

---

## 4. Estrategia

**Abordagem:** testes de contrato HTTP — o `AvaliacaoService` e completamente mockado via `jest.mock()`. As requisicoes HTTP sao feitas com `supertest` contra um app Express que monta o roteador real de avaliacao (`avaliacaoRotas.js`), de modo que o middleware de autenticacao e o proprio arquivo de rotas sejam exercitados e contabilizados na cobertura.

### 4.1 Autenticação por sessão

Todas as rotas do módulo exigem bearer de sessão. Os testes de route usam identidade controlada; a integração Better Auth é validada nas suítes específicas.

| Helper          | Perfil Simulado                                  | Usado em                        |
| --------------- | ------------------------------------------------ | ------------------------------- |
| `usuarioAuth()` | `{ id: testIds.interessado, perfil: "USUARIO" }` | todas as operacoes autenticadas |

### 4.3 Observacao sobre o repasse do ator

O controller de avaliacao repassa o ator de forma distinta conforme o metodo:

- `criar` envia `req.user.id` (string) ao service;
- `listar`, `buscarPorId`, `atualizar` e `deletar` enviam `req.user` (objeto) ao service.

As assercoes do teste refletem essa diferenca.

### 4.4 Arquivo de Teste

```
src/tests/routes/avaliacao.spec.js
```
---

## 5. Cenarios de Teste

### 5.1 Autenticacao

**RF-017**

| ID    | Descricao                        | Payload / Auth              | Mock Service          | Status HTTP | Validacao                     | Status |
| ----- | -------------------------------- | --------------------------- | --------------------- | ----------- | ----------------------------- | ------ |
| RA-01 | Requisicao sem token retorna 498 | GET sem header Authorization | nao chega ao service  | `498`       | bloqueado pelo AuthMiddleware | PASSOU |

---

### 5.2 POST /avaliacoes — Criar

**RF-017**

| ID    | Descricao                                | Payload / Auth                        | Mock Service                | Status HTTP | Validacao                                   | Status |
| ----- | ---------------------------------------- | ------------------------------------- | --------------------------- | ----------- | ------------------------------------------- | ------ |
| RA-02 | Cria avaliacao retorna 201               | body completo, token de usuario       | `criar: avaliacao`          | `201`       | `data` correto; `criar` recebe dados + `req.user.id` | PASSOU |

---

### 5.3 GET /avaliacoes — Listar

**RF-017**

| ID    | Descricao                                | Payload / Auth                                  | Mock Service                  | Status HTTP | Validacao                                     | Status |
| ----- | ---------------------------------------- | ----------------------------------------------- | ----------------------------- | ----------- | --------------------------------------------- | ------ |
| RA-03 | Lista avaliacoes com filtros retorna 200 | `?avaliado_id&page=2&limite=5`, token de usuario | `listarPorUsuario: paginado` | `200`       | `listarPorUsuario` recebe filtros/page/limit + ator | PASSOU |

---

### 5.4 GET /avaliacoes/:id — Buscar por ID

**RF-017**

| ID    | Descricao                          | Payload / Auth          | Mock Service                     | Status HTTP | Validacao               | Status |
| ----- | ---------------------------------- | ----------------------- | -------------------------------- | ----------- | ----------------------- | ------ |
| RA-04 | Busca avaliacao por id retorna 200 | `GET /avaliacoes/:id`   | `buscarPorId: avaliacao`         | `200`       | `data` correto          | PASSOU |
| RA-05 | Avaliacao inexistente retorna 404  | `GET /avaliacoes/:id`   | `buscarPorId: CustomError 404`   | `404`       | mensagem nao encontrada | PASSOU |

---

### 5.5 PUT /avaliacoes/:id — Atualizar

**RF-017**

| ID    | Descricao                                            | Payload / Auth                            | Mock Service                | Status HTTP | Validacao                                         | Status |
| ----- | --------------------------------------------------- | ----------------------------------------- | --------------------------- | ----------- | ------------------------------------------------- | ------ |
| RA-06 | Atualiza apenas nota e comentario retorna 200       | `{ nota, comentario }`, token de usuario  | `atualizar: avaliacao`      | `200`       | `atualizar` recebe id + dados + ator              | PASSOU |
| RA-07 | Tentativa de alterar campos sensiveis retorna 400   | `{ item_id }`, token de usuario           | nao chega ao service        | `400`       | `atualizar` nao chamado (bloqueado pelo schema)   | PASSOU |

---

### 5.6 DELETE /avaliacoes/:id — Remover

**RF-017**

| ID    | Descricao                                              | Payload / Auth          | Mock Service                  | Status HTTP | Validacao                                        | Status |
| ----- | ----------------------------------------------------- | ----------------------- | ----------------------------- | ----------- | ------------------------------------------------ | ------ |
| RA-08 | Remover avaliacao de outro usuario retorna 403        | token de usuario        | `deletar: CustomError 403`    | `403`       | mensagem de autoria; `deletar` recebe id + ator  | PASSOU |
| RA-09 | Remover avaliacao com sucesso retorna 204             | token de usuario        | `deletar: ok`                 | `204`       | sem body; `deletar` chamado 1x                   | PASSOU |

---

## 6. Resultado de Execucao

| Suite          | Arquivo                    | Testes | Aprovados | Reprovados | Status |
| -------------- | -------------------------- | ------ | --------- | ---------- | ------ |
| Rotas Avaliacao | `routes/avaliacao.spec.js` | **9**  | **9**     | **0**      | PASSOU |

### 6.1 Cobertura

> Preencher com os numeros reais de `npm run test:coverage`. Com a importacao do `avaliacaoRotas.js`, o arquivo de rotas passa a aparecer no relatorio de cobertura.

| Arquivo                  | Statements | Branches | Functions | Lines | Status |
| ------------------------ | ---------- | -------- | --------- | ----- | ------ |
| `avaliacaoRotas.js`      | _a definir_ | _a definir_ | _a definir_ | _a definir_ | _a definir_ |
| `AvaliacaoController.js` | _a definir_ | _a definir_ | _a definir_ | _a definir_ | _a definir_ |

---

## 7. Resumo dos Cenarios

| ID    | Rota                  | Descricao                         | Status HTTP | Status |
| ----- | --------------------- | --------------------------------- | ----------- | ------ |
| RA-01 | GET /avaliacoes       | Sem token retorna 498             | 498         | PASSOU |
| RA-02 | POST /avaliacoes      | Cria avaliacao                    | 201         | PASSOU |
| RA-03 | GET /avaliacoes       | Lista com filtros                 | 200         | PASSOU |
| RA-04 | GET /avaliacoes/:id   | Busca por id                      | 200         | PASSOU |
| RA-05 | GET /avaliacoes/:id   | Avaliacao inexistente             | 404         | PASSOU |
| RA-06 | PUT /avaliacoes/:id   | Atualiza nota e comentario        | 200         | PASSOU |
| RA-07 | PUT /avaliacoes/:id   | Bloqueia campos sensiveis         | 400         | PASSOU |
| RA-08 | DELETE /avaliacoes/:id | Remover de outro autor — 403     | 403         | PASSOU |
| RA-09 | DELETE /avaliacoes/:id | Remover com sucesso              | 204         | PASSOU |

---

## 8. Criterios de Aceitacao

- 100% dos testes de rotas de avaliacao aprovados (9/9)
- Status HTTP corretos para todos os cenarios
- Todas as rotas exigindo sessão válida (498 sem bearer)
- Bloqueio de alteracao de campos sensiveis na atualizacao (400)
- Controle de autoria propagado do service (403 para nao-autor)
- Propagacao correta de erros do service para o cliente
- Arquivo `avaliacaoRotas.js` coberto pelo relatorio de cobertura

---

## 9. Observacoes

- A suíte monta o roteador real (`avaliacaoRotas.js`) e exercita Zod, controller e autoria com identidade controlada. O middleware de produção é validado separadamente.
- Todas as rotas do modulo exigem apenas autenticacao (`AuthMiddleware`); nao ha exigencia de perfil ADMINISTRADOR neste modulo.
- O controle de autoria (apenas o autor edita/remove) e responsabilidade do service e e validado por propagacao de erro (RA-08).
- O bloqueio de campos sensiveis na atualizacao (item_id, avaliador_id, avaliado_id, tipo) ocorre na validacao do schema, antes de chegar ao service (RA-07).
- O `DELETE /avaliacoes/:id` retorna `204` (sem corpo), conforme `CommonResponse.success(res, null, 204)` no controller.
